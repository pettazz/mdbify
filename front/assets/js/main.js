const bsHide = (el) => {
  el.addClass("d-none");
}

const bsShow = (el) => {
  el.removeClass("d-none");
}

const uploadFiles = (eo) => {
  eo.preventDefault();

  $("#uploadContainer").slideUp();
  bsHide($("#uploadError"));
  $("#uploadProgress .progress-bar").width('0%').addClass(["progress-bar-striped", "progress-bar-animated"]);
  bsShow($("#uploadProgress"));

  let formData = new FormData(),
      uploadInput = $("#inputFiles").get(0).files;
  console.log('uploading ' + uploadInput.length + " files...");

  for(let iter = 0; iter < uploadInput.length; iter++){
    formData.append("file" + iter, uploadInput[iter]);
  }

  $.ajax({
    xhr: () => {
      var xhr = new window.XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if(e.lengthComputable){
          let percent = Math.round((e.loaded / e.total) * 100);
          $("#uploadProgress .progress-bar").html(percent + '%');
          $("#uploadProgress .progress-bar").width(percent + '%');
        }
      });
      return xhr;
    },
    url: 'http://127.0.0.1:6969/upload',
    type: 'POST',
    data: formData,
    dataType: 'json',
    mimeType: 'multipart/form-data',
    contentType: false,
    cache: false,
    processData: false,
    success: function(data, status, jqXHR){
      $("#uploadProgress .progress-bar").removeClass(["progress-bar-striped", "progress-bar-animated"]);
      sessionId = data.session_id;
      bsShow($("#sessionDetails"));
      $("#sessionIdTitle strong").html(sessionId);
      console.log('upload completeley! now asking the server for details');
      getFileAnalysis();
    },
    error: function(jqXHR, status, error){
      bsShow($("#uploadError"));
      $("#uploadContainer").slideDown();
      bsHide($("#uploadProgress"));
      $("#uploadError .serverMessage").html(jqXHR.status + ": " + jqXHR.responseText);
      console.error(jqXHR);
      console.error(status);
      console.error(error);
    }
  });  
}

const getFileAnalysis = () => {
  bsShow($("#analyzingPanel"));

  let data = {"session_id": sessionId};
  $.ajax({
    url: 'http://127.0.0.1:6969/analysis',
    type: 'GET',
    data: data,
    cache: false,
    success: function(data, status, jqXHR){
      bsHide($("#analyzingPanel .spinner-border"));
      bsShow($("#analyzingPanel .text-success"));
      fileListing = data;
      showCSVs();
    },
    error: function(jqXHR, status, error){
      bsShow($("#analysisError"));
      bsHide($("#analyzingPanel .spinner-border"));
      $("#analysisError .serverMessage").html(jqXHR.status + ": " + jqXHR.responseText);
      console.error(jqXHR);
      console.error(status);
      console.error(error);
    }
  });
}

const downloadCSV = (fileName, tableName) => {
  const sid = encodeURIComponent(sessionId),
        fname = encodeURIComponent(fileName),
        tname = encodeURIComponent(tableName);
  let url = `http://127.0.0.1:6969/convert/${sid}/${fname}-${tname}.csv`;
  location.href = url;
}

const showCSVs = () => {
  const showButton = `Show <i class="fas fa-chevron-right"></i>`,
        hideButton = `Hide <i class="fas fa-chevron-down"></i>`

  bsShow($("#csvPanel"));
  for(const file in fileListing){
    const item = fileListing[file];

    let row = $(`
      <tr class="${item.valid ? '' : 'table-danger'}">
        <td>${file}</td>
        <td>${item.valid ? '<span class="text-success"><i class="fas fa-check-circle"></i></span> ' + item.version : '<span class="text-danger"><i class="fas fa-times-circle"></i></span> Invalid'}</td>
        <td>${item.valid ? '<button type="button" class="btn btn-sm btn-outline-info showHideSchemaButton" data-toggle-class="schemaRow">' + showButton + '</button>' : ''}</td>
        <td>${item.valid ? '<button type="button" class="btn btn-sm btn-outline-info showHideTablesButton" data-toggle-class="tableRow">' + showButton + '</button>' : ''}</td>
      </tr>`);

    $("#csvTable tbody.mainTableBody").append(row);

    if(item.valid){
      let tableTable = $(`
        <tr class="d-none tableRow">
          <td colspan="4">
            <table class="table table-striped table-hover">
              <thead>
                <th>Table Name</th>
                <th>Download CSV</th>
              </thead>
              <tbody>
              </tbody>
            </table>
          </td>
        </tr>`);

      for(var i = item.tables.length - 1; i >= 0; i--){
        tableTable.find('tbody').append(`
          <tr>
            <td>${item.tables[i]}</td>
            <td><button type="button" class="btn btn-sm btn-info csvDownloader" data-file-name="${file}" data-table-name="${item.tables[i]}"><i class="fas fa-file-csv"></i></button></td>
          </tr>`);
      }

      $("#csvTable tbody.mainTableBody").append(tableTable);

      let schemaTable = $(`
        <tr class="d-none schemaRow">
          <td colspan="4">
            <pre><code>${item.schema}</code></pre>
          </td>
        </tr>`);

      $("#csvTable tbody.mainTableBody").append(schemaTable);
    }
  }

  const rowToggleButtonBinder = (eo) => {
    eo.preventDefault();

    let thisEl = $(eo.target);
    if(!thisEl.is("button")){
      thisEl = $(eo.target).parent("button");
    }

    let relevantRow = thisEl.parent('td').parent('tr').nextAll('tr.' + thisEl.data('toggleClass')).first();
    if(thisEl.data('showing')){
      bsHide(relevantRow);
      thisEl.data('showing', false);
      thisEl.html(showButton);
    }else{
      bsShow(relevantRow);
      thisEl.data('showing', true);
      thisEl.html(hideButton);
    }
  }

  $(".showHideSchemaButton").click(rowToggleButtonBinder);
  $(".showHideTablesButton").click(rowToggleButtonBinder);

  $(".csvDownloader").click((eo) => {
    eo.preventDefault();

    let thisEl = $(eo.target);
    if(!thisEl.is("button")){
      thisEl = $(eo.target).parent("button");
    }
    downloadCSV(thisEl.data('fileName'), thisEl.data('tableName'));
  });
}


let sessionId,
    fileListing;

$(document).ready(() => {

  $("form#uploader").submit(uploadFiles);

});