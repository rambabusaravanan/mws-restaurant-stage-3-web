/**
 * Common database helper functions.
 */

const DB_NAME = 'mws-stage-3';
const STORE_RSTNT = 'restaurants';
const STORE_RVIEW = 'reviews';

const dbPromise = idb.open(DB_NAME, 2, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore(STORE_RSTNT);
    case 1:
      upgradeDB.createObjectStore(STORE_RVIEW);
    }

});

const database = {
  getReviews() {
    return dbPromise.then(db => {
      return db.transaction(STORE_RVIEW)
        .objectStore(STORE_RVIEW).getAll();
    })    
  },
  createReview(key, val) {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_RVIEW, 'readwrite');
      tx.objectStore(STORE_RVIEW).put(val, key);
      return tx.complete;
    });
  },
  getAll() {
    return dbPromise.then(db => {
      return db.transaction(STORE_RSTNT)
        .objectStore(STORE_RSTNT).getAll();
    })    
  },
  get(key) {
    return dbPromise.then(db => {
      return db.transaction(STORE_RSTNT)
        .objectStore(STORE_RSTNT).get(key);
    });
  },
  set(key, val) {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_RSTNT, 'readwrite');
      tx.objectStore(STORE_RSTNT).put(val, key);
      return tx.complete;
    });
  },
  delete(key) {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_RSTNT, 'readwrite');
      tx.objectStore(STORE_RSTNT).delete(key);
      return tx.complete;
    });
  },
  clear() {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_RSTNT, 'readwrite');
      tx.objectStore(STORE_RSTNT).clear();
      return tx.complete;
    });
  },
  keys() {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_RSTNT);
      const keys = [];
      const store = tx.objectStore(STORE_RSTNT);

      // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
      // openKeyCursor isn't supported by Safari, so we fall back
      (store.iterateKeyCursor || store.iterateCursor).call(store, cursor => {
        if (!cursor) return;
        keys.push(cursor.key);
        cursor.continue();
      });

      return tx.complete.then(() => keys);
    });
  }
};


 class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    // Changed this to your relative path
    // return 'data/restaurants.json';
    const LOCAL_API = 'http://localhost:1337';
    const REMOTE_API = 'https://mws-stage-3.herokuapp.com';
    return location.hostname === "localhost" ? LOCAL_API : REMOTE_API;
  }



  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {      
    database.getAll()
      .then(restaurants => {
        if(Array.isArray(restaurants) && restaurants.length > 0) {
          callback(null, restaurants);
        }

        // fetch fresh
        fetch(DBHelper.DATABASE_URL + "/restaurants")
          .then(res => res.json())
          .then(res => {
            res.forEach(r => database.set(r.id, r));
            callback(null, restaurants)
            // return res;
          })
          .catch(error => {
            console.error(error);
            error = (`Request failed. ${error.message}`);
            callback(error, null)
          })
      });

    // let xhr = new XMLHttpRequest();
    // // xhr.open('GET', DBHelper.DATABASE_URL);
    // xhr.open('GET', DBHelper.DATABASE_URL + "/restaurants");
    // xhr.onload = () => {
    //   if (xhr.status === 200) { // Got a success response from server!
    //     const json = JSON.parse(xhr.responseText);
    //     // const restaurants = json.restaurants;
    //     callback(null, json);
    //   } else { // Oops!. Got an error from server.
    //     const error = (`Request failed. Returned status of ${xhr.status}`);
    //     callback(error, null);
    //   }
    // };
    // xhr.send();
  }


  /**
   * Fetch reviews for a restaurant by its ID.
   */
  static fetchReviewsByRestaurantId(id, callback) {

    if(!navigator.onLine) {
      database.getReviews(parseInt(id))
        .then(reviews => reviews.filter(r => r.restaurant_id === id))
        .then(reviews => {
          if(reviews.length) {
            callback(null, reviews);
          }
        })
      return;
    }

    // fetch fresh
    fetch(DBHelper.DATABASE_URL + "/reviews/?restaurant_id="+ id)
      .then(res => res.json())
      .then(res => {
        res.forEach(r => database.createReview(r.id, r));
        callback(null, res)
        // return res;
      })
      .catch(error => {
        console.error(error);
        error = (`Request failed. ${error.message}`);
        callback(error, null)
      })

    // // fetch all restaurants with proper error handling.
    // DBHelper.fetchRestaurants((error, restaurants) => {
    //   if (error) {
    //     callback(error, null);
    //   } else {
    //     const restaurant = restaurants.find(r => r.id == id);
    //     if (restaurant) { // Got the restaurant
    //       callback(null, restaurant);
    //     } else { // Restaurant does not exist in the database
    //       callback('Restaurant does not exist', null);
    //     }
    //   }
    // });
  }

  static post(url = ``, data = {}) {
    // Default options are marked with *
      return fetch(url, {
          method: "POST", // *GET, POST, PUT, DELETE, etc.
          mode: "cors", // no-cors, cors, *same-origin
          cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
          credentials: "same-origin", // include, *same-origin, omit
          headers: {
              "Content-Type": "application/json; charset=utf-8",
          },
          // redirect: "follow", // manual, *follow, error
          // referrer: "no-referrer", // no-referrer, *client
          body: JSON.stringify(data), // body data type must match "Content-Type" header
      })
      .then(response => response.json()); // parses response to JSON
  }

  static put(url = ``, data = {}) {
    // Default options are marked with *
      return fetch(url, {
          method: "PUT", // *GET, POST, PUT, DELETE, etc.
          mode: "cors", // no-cors, cors, *same-origin
          cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
          credentials: "same-origin", // include, *same-origin, omit
          headers: {
              "Content-Type": "application/json; charset=utf-8",
          },
          // redirect: "follow", // manual, *follow, error
          // referrer: "no-referrer", // no-referrer, *client
          body: JSON.stringify(data), // body data type must match "Content-Type" header
      })
      .then(response => response.json()); // parses response to JSON
  }

  static postReview(review, callback) {
    DBHelper.post(DBHelper.DATABASE_URL + "/reviews", review)
      .then(res => {
        callback(null, res)
      })
      .catch(error => {
        callback(error, null)
      })
  }

  static markFavorite(id, isFavorite, callback) {
    DBHelper.put(DBHelper.DATABASE_URL + "/restaurants/" + id + "?is_favorite="+isFavorite)
      .then(res => {
        callback(null, res)
      })
      .catch(error => {
        callback(error, null)
      })
    }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    let cachedResponse = false;
    database.get(parseInt(id))
      .then(restaurant => {
        if(restaurant) {
          cachedResponse = true;
          callback(null, restaurant);
        } 

        // fetch fresh
        fetch(DBHelper.DATABASE_URL + "/restaurants/"+ id)
          .then(res => res.json())
          .then(res => {
            database.set(res.id, res);
            if(!cachedResponse)
              callback(null, res)
            // return res;
          })
          .catch(error => {
            console.error(error);
            error = (`Request failed. ${error.message}`);
            callback(error, null)
          })
      });

    // // fetch all restaurants with proper error handling.
    // DBHelper.fetchRestaurants((error, restaurants) => {
    //   if (error) {
    //     callback(error, null);
    //   } else {
    //     const restaurant = restaurants.find(r => r.id == id);
    //     if (restaurant) { // Got the restaurant
    //       callback(null, restaurant);
    //     } else { // Restaurant does not exist in the database
    //       callback('Restaurant does not exist', null);
    //     }
    //   }
    // });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if(restaurant && restaurant.photograph)
      return (`img/${restaurant.photograph}.jpg`);
    else
      return 'https://via.placeholder.com/320x250.png?text=No%20Photographs';
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker(
      [restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

