document.addEventListener("DOMContentLoaded", {

});
function connect()
{
    var email = document.getElementById("email");
    var password = document.getElementById("password");
    console.log("connect ["+email.valueOf()+";"+password.valueOf()+"]");
    window.location.href = "Home.html";
}
function regist() {

}
function login()
{
    var content = document.getElementsByClassName("content");
    content.innerHTML = "" +
        "<section class=\"panel\">\n" +
        "        <div class=\"hero\">\n" +
        "            <h2>Login</h2>\n" +
        "            <label for=\"email\">Email:</label>\n" +
        "            <input type=\"text\" id=\"email\" required/>\n" +
        "            <label for=\"password\">Password:</label>\n" +
        "            <input type=\"password\" id=\"password\" required/>\n" +
        "            <br>\n" +
        "            <button class=\"btn\" onclick=\"connect()\">Connect</button>\n" +
        "            <br>\n" +
        "            <p>\n" +
        "                még nincs fiókom, <a onclick=\"regist()\">regisztrálok</a>\n" +
        "            </p>\n" +
        "        </div>\n" +
        "    </section>";
}