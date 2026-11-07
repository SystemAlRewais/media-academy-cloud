async function api(path,{method="GET",body=null,auth=true}={}) {
 if(!cfg.API_BASE_URL) throw new Error("لم يتم إعداد رابط خدمة النظام بعد. أضف رابط الخادم في assets/js/config.js.");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),cfg.REQUEST_TIMEOUT_MS||15000);
 try{
  // تحويل المسارات لتتوافق مباشرة مع جوجل سكربت وتجنب أخطاء الاستضافة
  let targetUrl = cfg.API_BASE_URL.replace(/\/$/,"");
  let fullBody = body ? {...body} : {};
  
  if (path.startsWith("/auth/login")) {
    fullBody.action = "login";
  } else if (path.startsWith("/auth/register")) {
    fullBody.action = "register";
  } else {
    fullBody.path = path;
  }

  const headers={"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"};
  if(auth&&token)headers.Authorization="Bearer "+token;
  
  const response=await fetch(targetUrl,{
    method: method,
    headers: headers,
    body: method === "POST" ? JSON.stringify(fullBody) : undefined,
    signal: controller.signal
  });
  
  const data=await response.json().catch(()=>({}));
  if(!response.ok || data.success === false) throw new Error(data.message||data.error||"تعذر تنفيذ الطلب. راجع البيانات وحاول مرة أخرى.");
  return data;
 }catch(error){if(error.name==="AbortError")throw new Error("انتهت مهلة الاتصال بالخادم.");throw error}
 finally{clearTimeout(timer)}
}
