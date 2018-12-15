let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
  registerServiceWorker();
  window.addEventListener('online', syncReviews);
});

function showSnackbar(message) {
  var x = document.getElementById("snackbar");
  x.innerHTML = message;
  x.className = "show";
  setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}


function syncReviews(event) {
  database.getReviews()
    .then(reviews => {
      reviews = reviews.filter(r => r.isOffline === true)
      if(reviews.length) {
        showSnackbar("You're online. Offline reviews are updating")
      }
      reviews.forEach(r => {
        r.isOffline = false;
        DBHelper.postReview(r, (error, response) => {
          if(response) {
            database.createReview(response.id, response)
          }
        })
      })
    })
}

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoicmFtYmFidXNhcmF2YW5hbiIsImEiOiJjampvam04dzgyOWtnM3Bueng5MHZzOGRwIn0.TPUiUXNkGgowwurXOGR03w',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(newMap);
      fillBreadcrumb();
      updateMapLabel(restaurant.name);
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

handleFavoriteClick = () => {
  let restaurant = window.restaurant;
  let fav = restaurant.is_favorite === "true";
  let newFav = !fav;
  DBHelper.markFavorite(restaurant.id, newFav, (err, res) => {
    if(res) {
      let className = newFav ? "fas fa-heart" : "far fa-heart"
      document.getElementById("favorite-icon").className = className
      window.restaurant = res;
    }
  })
}

handleCreateReviewForm = event => {
  let restaurant_id = parseInt(getParameterByName('id'));
  let name = document.getElementById('review-name').value;
  let rating = document.getElementById('review-rating').value;
  let comments = document.getElementById('review-comments').value;
  let createdAt = Date.now();

  let data = {
    id: createdAt,
    restaurant_id,
    name,
    rating,
    comments,
    createdAt
  }


  data.isOffline = true;
  database.createReview(data.id, data)

  if(!navigator.onLine) {
    showSnackbar("Offline! Your review will be updated once online")
    // update in ui
    const ul = document.getElementById('reviews-list');
    ul.appendChild(createReviewHTML(data));
    document.getElementById("review-form").reset()
  } else {
    data.isOffline = false;
    DBHelper.postReview(data, function(error, response) {
      // update in ui
      const ul = document.getElementById('reviews-list');
      ul.appendChild(createReviewHTML(response));
      document.getElementById("review-form").reset()
    });
  }
    // DBHelper.fetchReviewsByRestaurantId(restaurant_id, (error, reviews) => {
    //   if (!reviews) {
    //     console.error(error);
    //     return;
    //   }
    //   fillReviewsHTML(reviews);
    // })
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      window.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML(restaurant);
      callback(null, restaurant)
    });

    DBHelper.fetchReviewsByRestaurantId(id, (error, reviews) => {
      if (!reviews) {
        console.error(error);
        return;
      }
      fillReviewsHTML(reviews);
    })
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  let className = restaurant.is_favorite === "true" ? "fas fa-heart" : "far fa-heart";
  document.getElementById("favorite-icon").className = className;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.alt = "Photo extract of " + restaurant.name + "'s Restaurant";
  image.title = "Photo extract of " + restaurant.name + "'s Restaurant";
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-list-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');

  const reviewHead = document.createElement('div');
  reviewHead.className = 'head';

  const rating = document.createElement('p');
  rating.className = 'rating';
  rating.innerHTML = review.rating;
  reviewHead.appendChild(rating);

  const name = document.createElement('p');
  name.className = 'name';
  name.innerHTML = review.name;
  reviewHead.appendChild(name);

  const date = document.createElement('p');
  date.className = 'date';
  date.innerHTML = new Date(review.createdAt).toDateString()
  // date.innerHTML = review.date;

  reviewHead.appendChild(date);

  li.appendChild(reviewHead);

  const comments = document.createElement('p');
  comments.className = 'comments';
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const ul = breadcrumb.getElementsByTagName('ul')[0];
  const a = document.createElement('a');
  a.setAttribute('aria-current', 'page');
  a.setAttribute('href', window.location);
  a.innerHTML = restaurant.name;
  const li = document.createElement('li');
  li.appendChild(a);
  ul.appendChild(li);
}

updateMapLabel = (name) => {
  const map = document.getElementById('map');
  map.setAttribute('aria-label', 'map location of ' + name)
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    console.log('Service Worker is unavailable!');
    return;
  }
  navigator.serviceWorker.register('./sw.js').then(() => {
    console.log('Service Worker registration succeeded!');
  }).catch((error) => {
    console.log('Service Worker registration failed:', error);
  });
}