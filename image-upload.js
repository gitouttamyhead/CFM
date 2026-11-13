/**
 * Firebase Storage image upload handler for TinyMCE.
 * Uploads images to Firebase Storage instead of embedding base64 in Firestore documents.
 * Requires: firebase-app.js loaded and Firebase initialized. Loads firebase-storage.js on demand if needed.
 */
window.ImageUpload = {
    _storageReady: null,

    /**
     * Ensure firebase.storage() is available (compat SDK).
     * Self-heals if firebase-storage.js failed to load or was omitted from the page.
     */
    ensureStorage: function () {
        if (typeof firebase === 'undefined') {
            return Promise.reject(new Error('Firebase is not loaded'));
        }
        if (typeof firebase.storage === 'function') {
            if (!window.storage) {
                try {
                    window.storage = firebase.storage();
                } catch (e) { /* ignore */ }
            }
            return Promise.resolve(firebase.storage());
        }
        if (this._storageReady) return this._storageReady;

        var self = this;
        this._storageReady = new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-cfm-firebase-storage]');
            if (existing) {
                existing.addEventListener('load', function () {
                    if (typeof firebase.storage === 'function') {
                        window.storage = firebase.storage();
                        resolve(window.storage);
                    } else {
                        reject(new Error('firebase.storage is still not a function after storage script load'));
                    }
                });
                existing.addEventListener('error', function () {
                    self._storageReady = null;
                    reject(new Error('Failed to load firebase-storage.js'));
                });
                return;
            }

            var s = document.createElement('script');
            s.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js';
            s.async = true;
            s.setAttribute('data-cfm-firebase-storage', '1');
            s.onload = function () {
                if (typeof firebase.storage === 'function') {
                    window.storage = firebase.storage();
                    resolve(window.storage);
                } else {
                    self._storageReady = null;
                    reject(new Error('firebase.storage is still not a function after storage script load'));
                }
            };
            s.onerror = function () {
                self._storageReady = null;
                reject(new Error('Failed to load firebase-storage.js from CDN'));
            };
            document.head.appendChild(s);
        });
        return this._storageReady;
    },

    /**
     * TinyMCE images_upload_handler — uploads blob to Firebase Storage,
     * returns the public download URL.
     */
    handler: function (blobInfo, progress) {
        return window.ImageUpload.ensureStorage().then(function (storage) {
            return new Promise(function (resolve, reject) {
                var storageRef = storage.ref();
                var filename = Date.now() + '_' + (blobInfo.filename() || 'image.png');
                var imageRef = storageRef.child('insights/images/' + filename);
                var uploadTask = imageRef.put(blobInfo.blob());

                uploadTask.on(
                    'state_changed',
                    function (snapshot) {
                        var pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (typeof progress === 'function') progress(pct);
                    },
                    function (error) {
                        console.error('Image upload failed:', error);
                        reject('Image upload failed: ' + (error && error.message ? error.message : String(error)));
                    },
                    function () {
                        uploadTask.snapshot.ref
                            .getDownloadURL()
                            .then(function (url) {
                                resolve(url);
                            })
                            .catch(function (err) {
                                reject('Could not get download URL: ' + err.message);
                            });
                    }
                );
            });
        });
    }
};
