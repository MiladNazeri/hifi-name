/*global require, __dirname, console*/
var express = require('express');
var app = express();
app.use(express.static(__dirname));

app.get(function(){
    console.log(getting);
})
app.listen(3001, function() {
    console.log("server is listening");
})
