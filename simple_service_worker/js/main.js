// Make sure sw are supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw_cached_site.js')
      .then(reg => console.log('Service Worker: Registered (Pages)'))
      .catch(err => console.log(`Service Worker: Error: ${err}`));
  });
}

dummyPost();


function dummyPost(){
  console.log("dummyPost");
  // const request = new Request('https://jsonplaceholder.typicode.com/todos/1', {method: 'GET', mode: "no-cors"});
  fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({a: 1, b: 'Textual content'})
  })
  .then(json => console.log('consumer', json))
  .catch(error => {
    console.error(error);
  });
}