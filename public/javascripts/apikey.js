/**
 * Created by P.K.V.M. on 2/14/19.
 */
var BROWSER_APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlpZCI6IjUyNjNlMGY4LWRkNDQtNGJmYy04MzNkLTZhNmZkOThiODE5YyIsImFwcG5hbWUiOiJicm93c2VycyIsImlhdCI6MTU1MTAyNzU2OSwiZXhwIjoxNjE0MDk5NTY5fQ._6wha3A7azBjDLYxlT5x18e_XZFcvjP_SU3Xvg2dvtg";
var clientData;
function storageAvailable(type) {
    try {
        var storage = window[type],
            x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
                // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage.length !== 0;
    }
}
if (storageAvailable('sessionStorage')) {
    clientData = window['sessionStorage'];
}