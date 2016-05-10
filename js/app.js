"use strict";
// google maps global vars
var map,
    infowindow,
    google;

// FourSquare model for API data retrieved
var FourSquareVenue = function(data) {
    this.id = data.venue.id;
    this.name = data.venue.name;
    this.phone = data.venue.contact.formattedPhone || "n/a";
    this.lat = data.venue.location.lat;
    this.lng = data.venue.location.lng;
    this.rating = data.venue.rating || "n/a";
    this.website = data.venue.url;
    this.category = data.venue.categories[0].name;
    this.formattedAddress = data.venue.location.formattedAddress;
};

// main view model
function AppViewModel() {
    var self = this;
    var venueMarkers = []; // holds FourSquare venue marker details
    self.location = "Katoomba, New South Wales, Australia";
    self.venueList = ko.observableArray([]); // most popular place Foursquare picks base on neighborhood and input keyword
    self.filteredList = ko.observableArray(self.venueList());
    self.keyword = ko.observable(""); // stores filter keyword for filteredList    
    self.lat = ko.observable(-33.714955); // default map coordinates (Katoomba, New South Wales, Australia)
    self.lng = ko.observable(150.311407);
    self.errorFound = ko.observable(false);

    self.focusVenue = function(data) {
        var place = new google.maps.LatLng(data.lat, data.lng);
        var venueMarkersLength = venueMarkers.length;
        for (var i = 0; i < venueMarkersLength; i++) {
            if (venueMarkers[i].marker_id === data.id) {
                // bounce venue marker 
                venueMarkers[i].setAnimation(4);
                // trigger infowindow
                google.maps.event.trigger(venueMarkers[i], 'click');
            }
        }
        map.panTo(place);
    };

    // Filter the displayed Place list and marker on page by filterword
    self.filterByKeyword = function() {
        // filter by keyword
        //console.log("filtering by " + self.keyword());
        var list = [];
        var filterword = self.keyword().toLowerCase();
        var venueListLength = self.venueList().length;

        for (var i = 0; i < venueListLength; i++) {
            // self.venueList()[i].formattedAddress.toString().toLowerCase().indexOf(filterword) != -1
            if (self.venueList()[i].name.toLowerCase().indexOf(filterword) != -1 || self.venueList()[i].category.toLowerCase().indexOf(filterword) != -1) {
                list.push(self.venueList()[i]);
            }
        }
        // remove all markers and displayed filtered ones
        removeAllMarkers();
        self.filteredList(list);
        var filteredListLength = self.filteredList().length;

        self.filteredList().forEach(function(venue) {
            createMarker(venue);
        });
    };

    function initFourSquare() {
        // init FourSquare places
        // https://api.foursquare.com/v2/venues/explore?client_id=VURBYSUQGLHUQVGOAO1PP4HQWKRGKATBOIHSTXEF05HR01BY&client_secret=HLDDVTWGDB1DYP4Z3V2BWRXTMNTNSH2P1YEFXCEQL1JPMKAC&v=20130815&ll=40.7,-74&query=sushi&limit=5
        var api_url = "https://api.foursquare.com/v2/venues/explore"; // API main url - change explore to search for more options
        var client_id = "VURBYSUQGLHUQVGOAO1PP4HQWKRGKATBOIHSTXEF05HR01BY"; // API client id
        var client_secret = "HLDDVTWGDB1DYP4Z3V2BWRXTMNTNSH2P1YEFXCEQL1JPMKAC"; // API client secret
        var version = "20130815"; // API version
        var section = "topPicks"; // topPicks - grabs most popular spots based on location
        var limit = "15"; // limit to 15 venues

        var FourSquareAPI = api_url + '?client_id=' + client_id + '&client_secret=' + client_secret + '&ll=' + self.lat() + ',' + self.lng() + '&v=' + version + '&section=' + section + '&limit' + limit;

        $.getJSON(FourSquareAPI)
            .done(function(data) {
                var FourSquareVenues = data.response.groups[0].items;
                var FourSquareVenuesLength = FourSquareVenues.length;

                FourSquareVenues.forEach(function(data) {
                    self.venueList.push(new FourSquareVenue(data));
                });

                self.filteredList(self.venueList());
                // create map markers for FourSquare venues
                self.venueList().forEach(function(venue) {
                    createMarker(venue, true);
                });
            }).fail(function() {
                // error loading API data
                self.errorFound(true);
            });
    }

    function createMarker(data) {
        var place = new google.maps.LatLng(data.lat, data.lng);

        // create marker for FourSquare venue
        var marker = new google.maps.Marker({
            map: map,
            position: place,
            title: data.name,
            marker_id: data.id
        });

        // create InfoWindow for marker 
        createInfoWindow(data, marker);

        // push markers into venueMarkers array
        venueMarkers.push(marker);
    }

    function removeAllMarkers() {
        // remove markers
        venueMarkers.forEach(function(place) {
            place.setMap(null);
        });
        venueMarkers = [];
    }

    function createInfoWindow(data, marker) {
        var formattedName = data.name.replace(/[^A-Z0-9]/ig, "_"); // remove spaces and special characters from name (for modal IDs)
        var formattedURL;
        var formattedAddress = data.formattedAddress.toString().replace(/,/g, ", "); // add a space after each comma

        // create href if url is available
        if (data.website) {
            formattedURL = "<a href='" + data.website + "'>" + data.website + "</a>";
        } else {
            formattedURL = "n/a";
        }

        var html = "<h3>" + data.name + "</h3>"
                 + "<p>Address: " + formattedAddress + "</p>"
                 + "<p>Website: " + formattedURL + "</p>" 
                 + "<p>Rating: <span class='badge'>" + data.rating + "</span></p>";

        // add a listener to marker to open infowindow
        marker.addListener('click', function() {
            // bounce marker and open infowindow
            marker.setAnimation(4);
            infowindow.open(map, marker);
            infowindow.setContent(html);
        });
    }

    initFourSquare();
}

function googleError() {
    // display error if google API wasn't loaded properly
    viewModel.errorFound(true);
}

function initMap() {
    var mapOptions = {
        zoom: 15,
        disableDefaultUI: true,
        center: new google.maps.LatLng(viewModel.lat(), viewModel.lng()),
        mapTypeId: 'terrain'
    };
    map = new google.maps.Map($('#map')[0], mapOptions);

    // marker for home
    var position = new google.maps.LatLng(viewModel.lat(), viewModel.lng());
    var icon = 'http://udacity.kyra.co/img/gmap-home-icon.png';
    var marker = new google.maps.Marker({
        map: map,
        position: position,
        icon: icon,
        title: name
    });

    // init google Map infoWindows
    infowindow = new google.maps.InfoWindow({content: ""});
}

// initialize app
var viewModel = new AppViewModel();
ko.applyBindings(viewModel);

$(document).foundation();
