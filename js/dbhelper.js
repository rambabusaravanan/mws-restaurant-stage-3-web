/**
 * Common database helper functions.
 */

const DB_NAME = 'mws';
const STORE_NAME = 'restaurants';

const dbPromise = idb.open(DB_NAME, 1, upgradeDB => {
  upgradeDB.createObjectStore(STORE_NAME);
});

const database = {
  getAll() {
    return dbPromise.then(db => {
      return db.transaction(STORE_NAME)
        .objectStore(STORE_NAME).getAll();
    })    
  },
  get(key) {
    return dbPromise.then(db => {
      return db.transaction(STORE_NAME)
        .objectStore(STORE_NAME).get(key);
    });
  },
  set(key, val) {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(val, key);
      return tx.complete;
    });
  },
  delete(key) {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      return tx.complete;
    });
  },
  clear() {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      return tx.complete;
    });
  },
  keys() {
    return dbPromise.then(db => {
      const tx = db.transaction(STORE_NAME);
      const keys = [];
      const store = tx.objectStore(STORE_NAME);

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
    const REMOTE_API = 'https://mws-stage-2.herokuapp.com';
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

