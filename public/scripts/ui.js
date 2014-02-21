$(function () {
    //ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js
    $("#datepicker").datepicker({
        minDate: new Date(2013, 10, 5),
        maxDate: -1
    });
    $("#selection").buttonset();
    $("#sliderags").slider({min: 0, max: 100, value: 10});
    $("#sliderpts").slider({min: 0, max: 100, value: 10});
    $("#go").button().click(function () {
        $("#go").attr("disabled","disabled").button("option", "label", "loading - please be patient");
        location.href = "/" + $('input[name=action]:checked').val() + "?date=" + $("#datepicker").val().replace(/\//g, "-") + ($('input[name=action]:checked').val() == "genesis" ? "&supply=" + $("#supply").val() + "&portionPts=" + $("#sliderpts").slider('value')/100 + "&portionAgs=" + $("#sliderags").slider('value')/100 : "");
    });
});