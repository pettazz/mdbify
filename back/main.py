import os
import json
import aiofiles
import subprocess

import random_name

from sanic import Sanic
from sanic import response
from sanic.log import logger

app = Sanic("unmdbify-backend")
app.update_config("config.py")

if not os.path.exists(app.config.UPLOAD_DIR):
  os.makedirs(app.config.UPLOAD_DIR)

@app.route("/upload", methods=['POST'])
async def upload(request):
    session_id = random_name.generate_name()
    session_path = app.config.UPLOAD_DIR + "/" + session_id + "/"

    if not os.path.exists(session_path):
        os.makedirs(session_path)
    else:
        # lazy, very lazy
        return response.text(
            "Session conflict! Refresh the page and try again.",
            status=409
        )

    for file_item in request.files.keys():
        uploaded_file = request.files.get(file_item)
        async with aiofiles.open(session_path + uploaded_file.name, 'wb') as f:
            await f.write(uploaded_file.body)
        f.close()

    return response.json({"session_id": session_id})

@app.route("/analysis")
async def analysis(request):
    session_id = request.args.get("session_id")
    session_path = app.config.UPLOAD_DIR + "/" + session_id + "/"
    if not os.path.exists(session_path):
        return response.text(
            "No session data with that id! Refresh the page and try again.",
            status=404
        )

    file_details = {}
    for uploaded_file in os.listdir(session_path):
        details = {}
        result = subprocess.run(["mdb-ver", session_path + uploaded_file], capture_output=True)
        if result.returncode == 0:
            details["valid"] = True
            details["version"] = result.stdout.decode("utf-8").strip()

            tablesResult = subprocess.run(["mdb-tables", session_path + uploaded_file], capture_output=True)
            details["tables"] = tablesResult.stdout.decode("utf-8").strip().split(" ") 

            schemaResult = subprocess.run(["mdb-schema", session_path + uploaded_file], capture_output=True)
            details["schema"] = schemaResult.stdout.decode("utf-8").strip()

        else:
            details["valid"] = False
            details["error"] = result.stderr.decode("utf-8").strip()

        file_details[uploaded_file] = details

    return response.json(file_details)

@app.route("/convert/<session_id>/<file_name>-<table_name>.csv")
async def csv(request, session_id, file_name, table_name):
    session_path = app.config.UPLOAD_DIR + "/" + session_id + "/"

    if not os.path.exists(session_path) or not os.path.isfile(session_path + file_name):
        return response.text(
            "No session data with that id! Refresh the page and try again.",
            status=404
        )

    result = subprocess.run(["mdb-export", session_path + file_name, table_name], capture_output=True)
    if result.returncode == 0:
        return response.raw(result.stdout, headers={'Content-Disposition': 'attachment'})
    else:
        return response.text(
            "Unable to convert this file to CSV!",
            status=500
        )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6969)