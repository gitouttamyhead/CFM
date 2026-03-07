/**
 * Firebase Storage image upload handler for TinyMCE.
 * Uploads images to Firebase Storage instead of embedding base64 in Firestore documents.
 * Requires: firebase-app.js, firebase-storage.js loaded, and Firebase initialized.
 */
window.ImageUpload = {
    /**
     * TinyMCE images_upload_handler — uploads blob to Firebase Storage,
     * returns the public download URL.
     */
    handler: function (blobInfo, progress) {
        return new Promise(function (resolve, reject) {
            var storageRef = firebase.storage().ref();
            var filename = Date.now() + '_' + (blobInfo.filename() || 'image.png');
            var imageRef = storageRef.child('insights/images/' + filename);
            var uploadTask = imageRef.put(blobInfo.blob());

            uploadTask.on('state_changed',
                function (snapshot) {
                    var pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (typeof progress === 'function') progress(pct);
                },
                function (error) {
                    console.error('Image upload failed:', error);
                    reject('Image upload failed: ' + error.message);
                },
                function () {
                    uploadTask.snapshot.ref.getDownloadURL().then(function (url) {
                        resolve(url);
                    }).catch(function (err) {
                        reject('Could not get download URL: ' + err.message);
                    });
                }
            );
        });
    }
};
