import { UsuarioSesion } from "./poo/modelos.js";

const inputUser = document.getElementById("inputUsuario");
const inputPass = document.getElementById("inputPassword");
const btnLogin = document.getElementById("btnLogin");

// Para que Enter en el password envíe la solicitud
if (inputPass) {
    inputPass.addEventListener("keyup", (e) => {
        if (e.key === "Enter") btnLogin.click();
    });
}

btnLogin.addEventListener("click", () => {
    const user = inputUser.value.trim();
    const pass = inputPass.value.trim();

    const sesion = new UsuarioSesion();

    if (!user || !pass) {
        alert("Completá usuario y contraseña.");
        return;
    }

    if (sesion.login(user, pass)) {
        // Redirigir y dejar registro de actividad
        sesion.registrarActividad();
        // Abrimos index.html (o la ruta que uses)
        location.href = "index.html";
    } else {
        alert("Usuario o contraseña incorrectos.");
    }
});
