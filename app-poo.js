import { SistemaPanificados } from "./poo/sistema.js";

let sistema = null;

document.addEventListener("DOMContentLoaded", () => {
    sistema = new SistemaPanificados();
    sistema.iniciarSistema();

    // Para que los botones del HTML puedan llamarlo:
    window.sistema = sistema;

    // Registrar actividad inicial para evitar logout inmediato
    if (sistema && sistema.sesion && typeof sistema.sesion.registrarActividad === "function") {
        sistema.sesion.registrarActividad();
    }
});
