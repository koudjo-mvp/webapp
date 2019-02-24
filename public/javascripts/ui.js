/**
 * Created by P.K.V.M. on 6/18/18.
 */

/* GRID management */

var $grid = $('.grida').masonry({
    itemSelector: '.grid-item',
    columnWidth: '.grid-sizer',
    gutter: '.grid-gutter-sizer',
    percentPosition: true
});

// layout Masonry after each image loads
$grid.imagesLoaded().progress( function() {
    $grid.masonry('layout');
});