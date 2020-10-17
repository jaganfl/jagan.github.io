const cacheName = "v2";
var FOLDER_NAME = "post_requests";
let form_data;
// Call Install Event
self.addEventListener("install", (e) => {
  console.log("Service Worker: Installed");
});

// Call Activate Event
self.addEventListener("activate", (e) => {
  console.log("Service Worker: Activated");
  // Remove unwanted caches
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== cacheName) {
            console.log("Service Worker: Clearing Old Cache");
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

function getObjectStore(storeName, mode) {
  return our_db.transaction(storeName, mode).objectStore(storeName);
}

function savePostRequests(url, payload) {
  var request = getObjectStore(FOLDER_NAME, "readwrite").add({
    url: url,
    payload: payload,
    method: "POST",
  });
  request.onsuccess = function (event) {
    console.log("a new pos_ request has been added to indexedb");
  };

  request.onerror = function (error) {
    console.error(error);
  };
}

function openDatabase() {
  // if `flask-form` does not already exist in our browser (under our site), it is created
  var indexedDBOpenRequest = indexedDB.open("flask-form");

  indexedDBOpenRequest.onerror = function (error) {
    // errpr creatimg db
    console.error("IndexedDB error:", error);
  };

  indexedDBOpenRequest.onupgradeneeded = function () {
    // This should only execute if there's a need to create/update db.
    this.result.createObjectStore(FOLDER_NAME, {
      autoIncrement: true,
      keyPath: "id",
    });
  };

  // This will execute each time the database is opened.
  indexedDBOpenRequest.onsuccess = function () {
    our_db = this.result;
  };
}

var our_db;
openDatabase();

// Call Fetch Event
self.addEventListener("fetch", (event) => {
  console.log("Service Worker: Fetching");
  if (event.request.method === "GET") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Make copy/clone of response
          const resClone = res.clone();
          // Open cahce
          caches.open(cacheName).then((cache) => {
            // Add response to cache
            cache.put(event.request, resClone);
          });
          return res;
        })
        .catch((err) => caches.match(event.request).then((res) => res))
    );
  } else if (event.request.clone().method === "POST") {
    // attempt to send request normally
    event.respondWith(
      fetch(event.request.clone())
        .then(async (res) => {
          // Make copy/clone of response
          const jsonData = await res.json();
          // Open cahce
          // console.log(res);
          savePostRequests(event.request.clone().url, jsonData);
          return jsonData;
        })
        .catch(function (error) {
          // only save post requests in browser, if an error occurs
          // savePostRequests(event.request.clone().url, form_data)
          var savedRequests = [];
            var req = getObjectStore(FOLDER_NAME).openCursor(); // FOLDERNAME = 'post_requests'

            req.onsuccess = async function (e) {
              var cursor = e.target.result;

              if (cursor) {
                // Keep moving the cursor forward and collecting saved requests.
                savedRequests.push(cursor.value);
                cursor.continue();
              } else {
                // At this point, we have collected all the post requests in indexedb.
                for (let savedRequest of savedRequests) {
                  console.log("req", savedRequest);
                  if (savedRequest.url === event.request.clone().url) {
                    console.log("match", savedRequest.payload);
                    console.log("neww");
                    return savedRequest.payload;
                  }
                }
              }
            };
        })
    );
  }
});

self.addEventListener("message", function (event) {
  console.log("form data", event.data);
  if (event.data.hasOwnProperty("form_data")) {
    // receives form data from script.js upon submission
    form_data = event.data.form_data;
  }
});

function sendPostToServer() {
  var savedRequests = [];
  var req = getObjectStore(FOLDER_NAME).openCursor(); // FOLDERNAME = 'post_requests'

  req.onsuccess = async function (event) {
    var cursor = event.target.result;

    if (cursor) {
      // Keep moving the cursor forward and collecting saved requests.
      savedRequests.push(cursor.value);
      cursor.continue();
    } else {
      // At this point, we have collected all the post requests in indexedb.
      for (let savedRequest of savedRequests) {
        // send them to the server one after the other
        console.log("saved request", savedRequest);
        var requestUrl = savedRequest.url;
        var payload = JSON.stringify(savedRequest.payload);
        var method = savedRequest.method;
        var headers = {
          Accept: "application/json",
          "Content-Type": "application/json",
        }; // if you have any other headers put them here
        fetch(requestUrl, {
          headers: headers,
          method: method,
          body: payload,
        })
          .then(function (response) {
            console.log("server response", response);
            if (response.status < 400) {
              // If sending the POST request was successful, then remove it from the IndexedDB.
              getObjectStore(FOLDER_NAME, "readwrite").delete(savedRequest.id);
            }
          })
          .catch(function (error) {
            // This will be triggered if the network is still down. The request will be replayed again
            // the next time the service worker starts up.
            console.error("Send to Server failed:", error);
            // since we are in a catch, it is important an error is thrown,
            // so the background sync knows to keep retrying sendto server
            throw error;
          });
      }
    }
  };
}

/* self.addEventListener("sync", function (event) {
  console.log("now online");
  if (event.tag === "sendFormData") {
    // event.tag name checked here must be the same as the one used while registering sync
    event.waitUntil(
      // Send our POST request to the server, now that the user is online
      sendPostToServer()
    );
  }
}); */
