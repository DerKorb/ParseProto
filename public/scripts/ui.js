updateExample = function(type)
{
    html = "<script src=\"ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js\"></script>\n" +
        "<script>\n"+
        "$(function() {\n" +
        "\t$.get(\""+location.href+"/"+type+"\", function(data)) {\n"+
        "\t\t\n"+
        "\t\t\n"+
        "\t);\n"+
        "});\n" +
        "</script>\n";
    console.log(html);
    $("#source").text(html);
}


$(function()
{
    //ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js
    $("#datepicker").datepicker();
    $("#selection").buttonset();
    updateExample("pts.json");
    $("#go").button().click(function() {
       location.href="/"+$('input[name=action]:checked').val()+"?date="+$("#datepicker").val().replace(/\//g, "-");
    });
});