document.addEventListener("DOMContentLoaded", {

});
function connect()
{
    var email = document.getElementById("email");
    var password = document.getElementById("password");
    console.log("connect ["+email.valueOf()+";"+password.valueOf()+"]");
    window.location.href = "Home.html";
}