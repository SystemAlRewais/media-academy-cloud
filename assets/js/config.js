/* إعدادات الربط الشامل والسيرفر السحابي لجميع ملفات المنصة */
window.MEDIA_ACADEMY_CONFIG = Object.freeze({
  API_BASE_URL: "https://script.google.com/macros/s/AKfycbwOKUNXQwSuZO5ib9Zl_b-hfRplCApSP2VXzLlj8nk0VWwvAAgQOqjBp0Q8OQTSLLmXsA/exec",
  REQUEST_TIMEOUT_MS: 15000
});

// اعتراض وتحويل أي طلب من أي ملف في المنصة أوتوماتيكياً إلى السحابة لتجنب أخطاء Load failed
(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(resource, init) {
    let url = typeof resource === 'string' ? resource : resource.url;
    
    // إذا كان الطلب موجهاً للمسارات الداخلية (مثل /auth أو /api)، قم بتوجيهه للسحابة مباشرة
    if (url.startsWith('/auth') || url.startsWith('/api') || url.includes('login') || url.includes('register')) {
      const targetBase = window.MEDIA_ACADEMY_CONFIG.API_BASE_URL;
      let bodyData = init && init.body ? JSON.parse(init.body) : {};
      
      if (url.includes('login')) bodyData.action = 'login';
      if (url.includes('register')) bodyData.action = 'register';
      bodyData.path = url;

      return originalFetch(targetBase, {
        method: init && init.method ? init.method : 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyData)
      });
    }
    
    return originalFetch(resource, init);
  };
})();
