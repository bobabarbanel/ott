piece of upload saved.js
/*
                $.ajax({
                    url: '/upload',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: data => {
                        console.log("/upload success "+data);
                        location.reload();
                        
                        console.log('upload successful! ' + data.newFilesCount);

                        let id = '#' + idStr(position, offset, "count");
                        $(id).text(data.newFilesCount);  
                        
                    } *//*,
                    xhr:  () => {
                        // create an XMLHttpRequest
                        var xhr = new XMLHttpRequest();

                        // listen to the 'progress' event
                        xhr.upload.addEventListener('progress', function (evt) {

                            if (evt.lengthComputable) {
                                // calculate the percentage of upload completed
                                var percentComplete = evt.loaded / evt.total;
                                percentComplete = parseInt(percentComplete * 100);

                                // update the Bootstrap progress bar with the new percentage
                                $('.progress').text(percentComplete + '%');
                                $('.progress').width(percentComplete + '%');

                                // once the upload reaches 100%, set the progress bar text to done
                                if (percentComplete === 100) {
                                    $('.progress').html('Done');
                                }

                            }

                        }, false);

                        return xhr;
                    }*/