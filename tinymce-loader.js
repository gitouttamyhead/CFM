// Load TinyMCE from CDN using window.TINYMCE_API_KEY (set by app-config.js).
// Fallback key is only for backward compatibility; prefer setting TINYMCE_API_KEY in app-config.js.
(function () {
    var key = window.TINYMCE_API_KEY || 'ewx52xiayai247q9zlnoay8tigea0svtpwbigdrpuizkxj7j';
    var s = document.createElement('script');
    s.src = 'https://cdn.tiny.cloud/1/' + key + '/tinymce/6/tinymce.min.js';
    s.referrerPolicy = 'origin';
    document.head.appendChild(s);
})();
