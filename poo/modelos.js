// // MODELOS - PROGRAMACIÓN ORIENTADA A OBJETOS

// // ======================================================================
// // PRODUCTO
// // ======================================================================

// export class Producto {
//     constructor(id, nombre, categoria, precioCosto, precioVenta, stockInicial, stock, vendido = 0) {
//         this.id = id;
//         this.nombre = nombre;
//         this.categoria = categoria;
//         this.precioCosto = precioCosto || 0;
//         this.precioVenta = precioVenta || 0;

//         this.stockInicial =
//             (typeof stockInicial === 'number')
//                 ? stockInicial
//                 : (typeof stock === 'number' ? stock : 0);

//         this.stock =
//             (typeof stock === 'number')
//                 ? stock
//                 : (this.stockInicial || 0);

//         this.vendido = vendido || 0;
//     }

//     calcularGananciaUnidad() {
//         return (this.precioVenta || 0) - (this.precioCosto || 0);
//     }

//     calcularGananciaTotal() {
//         return (this.vendido || 0) * this.calcularGananciaUnidad();
//     }

//     calcularIngresoEsperado() {
//         return (this.stockInicial || 0) * (this.precioVenta || 0);
//     }

//     disminuirStock() {
//         if ((this.stock || 0) <= 0) return false;
//         this.stock = (this.stock || 0) - 1;
//         this.vendido = (this.vendido || 0) + 1;
//         return true;
//     }

//     aumentarStock(cantidad) {
//         cantidad = Number(cantidad) || 0;
//         this.stock = (this.stock || 0) + cantidad;
//         this.stockInicial = (this.stockInicial || 0) + cantidad;
//     }

//     registrarVenta() {
//         return this.disminuirStock();
//     }

//     devolverVenta() {
//         if ((this.vendido || 0) <= 0) return false;
//         this.vendido--;
//         this.stock++;
//         return true;
//     }

//     reiniciarVendidos() {
//         this.vendido = 0;
//     }
// }

// // ======================================================================
// // INVENTARIO
// // ======================================================================

// export class Inventario {
//     constructor(usuarioActivo) {
//         this.clave = `productos_${usuarioActivo}`;
//         this.productos = this.cargar();
//     }

//     cargar() {
//         const guardados = JSON.parse(localStorage.getItem(this.clave)) || [];
//         return guardados.map(p => Object.assign(new Producto(), p));
//     }

//     guardar() {
//         localStorage.setItem(this.clave, JSON.stringify(this.productos));
//     }

//     obtenerTodos() {
//         return this.productos;
//     }

//     buscarPorId(id) {
//         return this.productos.find(p => p.id === id);
//     }

//     agregarProducto(producto) {
//         this.productos.push(producto);
//         this.guardar();
//     }

//     eliminarProducto(id) {
//         this.productos = this.productos.filter(p => p.id !== id);
//         this.guardar();
//     }

//     registrarVenta(id) {
//         const prod = this.buscarPorId(id);
//         if (prod && prod.registrarVenta()) {
//             this.guardar();
//             return true;
//         }
//         return false;
//     }

//     devolverVenta(id) {
//         const prod = this.buscarPorId(id);
//         if (prod && prod.devolverVenta()) {
//             this.guardar();
//             return true;
//         }
//         return false;
//     }

//     sumarStock(id, cantidad) {
//         const prod = this.buscarPorId(id);
//         if (!prod) return false;
//         prod.aumentarStock(cantidad);
//         this.guardar();
//     }

//     calcularTotales() {
//         let costoTotal = 0;
//         let ventaEsperada = 0;
//         let ingresoReal = 0;
//         let gananciaReal = 0;

//         this.productos.forEach(p => {
//             costoTotal += (p.stockInicial || 0) * (p.precioCosto || 0);
//             ventaEsperada += p.calcularIngresoEsperado();
//             ingresoReal += (p.vendido || 0) * (p.precioVenta || 0);
//             gananciaReal += p.calcularGananciaTotal();
//         });

//         return { costoTotal, ventaEsperada, ingresoReal, gananciaReal };
//     }
// }

// // ======================================================================
// // USUARIO SESION
// // ======================================================================

// export class UsuarioSesion {
//     constructor() {
//         this.usuarioActivo = localStorage.getItem("usuarioActivo") || null;
//         this._claveUltimaActividad = "ultimaActividad";
//         this._monitorId = null;
//         this._listenersAct = [];
//     }

//     login(usuario, password) {
//         const usuariosValidos = {
//             "admin": "1234",
//             "vendedor": "1234",
//             "cristian": "1234",
//             "karen": "1234",
//             "estela": "1234"
//         };

//         if (usuariosValidos[usuario] === password) {
//             localStorage.setItem("usuarioActivo", usuario);
//             const ahora = Date.now();
//             localStorage.setItem(this._claveUltimaActividad, String(ahora));
//             this.usuarioActivo = usuario;
//             return true;
//         }
//         return false;
//     }

//     cerrarSesion() {
//         this.detenerMonitor();
//         localStorage.removeItem("usuarioActivo");
//         localStorage.removeItem(this._claveUltimaActividad);
//         location.href = "login.html";
//     }

//     estaLogueado() {
//         this.usuarioActivo = localStorage.getItem("usuarioActivo") || null;
//         return this.usuarioActivo !== null;
//     }

//     registrarActividad() {
//         localStorage.setItem(this._claveUltimaActividad, String(Date.now()));
//     }

//     obtenerUltimaActividad() {
//         const v = localStorage.getItem(this._claveUltimaActividad);
//         return v ? parseInt(v, 10) : null;
//     }

//     iniciarMonitor(inactividadMinutos = 15, onExpirar = null) {
//         if (this._monitorId) return;

//         const actualizar = () => this.registrarActividad();
//         this._listenersAct = ["click", "keydown", "mousemove", "touchstart"];
//         this._listenersAct.forEach(ev => window.addEventListener(ev, actualizar));

//         const intervalo = 15000;
//         const timeout = inactividadMinutos * 60000;

//         this._monitorId = setInterval(() => {
//             const ultima = this.obtenerUltimaActividad();
//             if (!ultima) {
//                 this.registrarActividad();
//                 return;
//             }

//             if (Date.now() - ultima > timeout) {
//                 this.detenerMonitor();
//                 localStorage.removeItem("usuarioActivo");
//                 localStorage.removeItem(this._claveUltimaActividad);
//                 if (onExpirar) onExpirar();
//                 else {
//                     alert("Sesión expirada por inactividad.");
//                     location.href = "login.html";
//                 }
//             }
//         }, intervalo);
//     }

//     detenerMonitor() {
//         if (this._monitorId) clearInterval(this._monitorId);
//         this._monitorId = null;
//         const actualizar = () => this.registrarActividad();
//         this._listenersAct.forEach(ev => window.removeEventListener(ev, actualizar));
//         this._listenersAct = [];
//     }
// }

// // ======================================================================
// // TURNOS
// // ======================================================================

// export class Turnos {
//     constructor(usuario) {
//         this.clave = `turnos_${usuario}`;
//         this.default = {
//             mañana: { inicio: "06:00", fin: "14:00" },
//             tarde: { inicio: "15:00", fin: "23:00" }
//         };
//         this.config = JSON.parse(localStorage.getItem(this.clave)) || this.default;
//     }

//     guardar() {
//         localStorage.setItem(this.clave, JSON.stringify(this.config));
//     }

//     obtenerTurnoActual() {
//         const ahora = new Date();
//         const hora = ahora.getHours() + ahora.getMinutes() / 60;

//         const m = this.config.mañana;
//         const t = this.config.tarde;

//         const parseHora = (str) => {
//             if (!str) return 0;
//             const parts = String(str).split(":");
//             return parseInt(parts[0] || 0, 10) + (parseInt(parts[1] || 0, 10) / 60);
//         };

//         const hM1 = parseHora(m.inicio);
//         const hM2 = parseHora(m.fin);
//         const hT1 = parseHora(t.inicio);
//         const hT2 = parseHora(t.fin);

//         if (hora >= hM1 && hora <= hM2) return "mañana";
//         if (hora >= hT1 && hora <= hT2) return "tarde";

//         return "fuera";
//     }
// }

// // ======================================================================
// // ESTADISTICAS
// // ======================================================================

// export class Estadisticas {
//     constructor(usuario) {
//         this.usuario = usuario;
//         this.prefijoDiario = `registro_diario_${this.usuario}_`;
//     }

//     _fechaHoyStr() {
//         const fecha = new Date();
//         const yyyy = fecha.getFullYear();
//         const mm = String(fecha.getMonth() + 1).padStart(2, "0");
//         const dd = String(fecha.getDate()).padStart(2, "0");
//         return `${yyyy}-${mm}-${dd}`;
//     }

//     obtenerRegistroDiario(fechaStr) {
//         const fecha = fechaStr || this._fechaHoyStr();
//         const clave = this.prefijoDiario + fecha;
//         return JSON.parse(localStorage.getItem(clave)) || null;
//     }

//     _crearRegistroDiarioBase(fechaStr) {
//         const fecha = fechaStr || this._fechaHoyStr();
//         return {
//             fecha,
//             turnos: {
//                 mañana: { venta: 0, ganancia: 0 },
//                 tarde: { venta: 0, ganancia: 0 }
//             },
//             productos: {}
//         };
//     }

//     guardarRegistroDiario(registro, fechaStr) {
//         const fecha = fechaStr || registro.fecha || this._fechaHoyStr();
//         const clave = this.prefijoDiario + fecha;
//         localStorage.setItem(clave, JSON.stringify(registro));
//     }

//     // =========================
//     //  ACTUALIZAR VENTA DIARIA
//     // =========================

//     actualizarVentaEnDiario(productoInfo, turno = "mañana") {

//         // ACÁ PEGAMOS EXACTAMENTE **TU FUNCIÓN ORIGINAL**
//         // (la que me pediste que mantenga y funciona bien)

//         const fecha = this._fechaHoyStr();
//         const clave = this.prefijoDiario + fecha;

//         let registro = JSON.parse(localStorage.getItem(clave));
//         if (!registro) registro = this._crearRegistroDiarioBase(fecha);

//         const t = (turno === "tarde") ? "tarde" : "mañana";

//         const cantidad = Number(productoInfo.cantidad) || 0;
//         const ganancia = Number(productoInfo.ganancia) || 0;
//         const precioVenta = Number(productoInfo.precioVenta || 0);
//         const precioCosto = Number(productoInfo.precioCosto || 0);

//         registro.turnos[t].venta = (registro.turnos[t].venta || 0) + cantidad;
//         registro.turnos[t].ganancia = (registro.turnos[t].ganancia || 0) + ganancia;

//         if (registro.turnos[t].venta < 0) registro.turnos[t].venta = 0;
//         if (registro.turnos[t].ganancia < 0) registro.turnos[t].ganancia = 0;

//         const pid = String(productoInfo.id);

//         registro.productos[pid] = registro.productos[pid] || {
//             id: productoInfo.id,
//             nombre: productoInfo.nombre,
//             categoria: productoInfo.categoria || "",
//             stockInicial: (typeof productoInfo.stockInicial !== "undefined") ? Number(productoInfo.stockInicial) : null,
//             stockFinal: (typeof productoInfo.stockFinal !== "undefined") ? Number(productoInfo.stockFinal) : null,
//             vendidosHoy: 0,
//             gananciaHoy: 0,
//             precioVenta: precioVenta || 0,
//             precioCosto: precioCosto || 0,
//             ingreso: 0
//         };

//         if (typeof productoInfo.stockInicial !== "undefined" && registro.productos[pid].stockInicial === null) {
//             registro.productos[pid].stockInicial = Number(productoInfo.stockInicial);
//         }
//         if (typeof productoInfo.stockFinal !== "undefined") {
//             registro.productos[pid].stockFinal = Number(productoInfo.stockFinal);
//         }

//         registro.productos[pid].vendidosHoy =
//             (registro.productos[pid].vendidosHoy || 0) + cantidad;

//         registro.productos[pid].gananciaHoy =
//             (registro.productos[pid].gananciaHoy || 0) + ganancia;

//         if (registro.productos[pid].vendidosHoy < 0) registro.productos[pid].vendidosHoy = 0;
//         if (registro.productos[pid].gananciaHoy < 0) registro.productos[pid].gananciaHoy = 0;

//         const pv = Number(registro.productos[pid].precioVenta) || 0;
//         registro.productos[pid].ingreso =
//             registro.productos[pid].vendidosHoy * pv;

//         this.guardarRegistroDiario(registro, fecha);
//     }

//     // =========================
//     //  TOTALES DEL DÍA
//     // =========================

//     calcularTotalesDelDia(fechaStr) {
//         const registro = this.obtenerRegistroDiario(fechaStr);
//         if (!registro)
//             return {
//                 ingresoReal: 0,
//                 gananciaReal: 0,
//                 ventaTotal: 0,
//                 costoVendido: 0,
//                 ventaEsperadaDelDia: 0
//             };

//         let ingresoReal = 0;
//         let gananciaReal = 0;
//         let costoVendido = 0;
//         let ventaEsperadaDelDia = 0;

//         Object.values(registro.productos || {}).forEach(p => {
//             const vendidos = Number(p.vendidosHoy || 0);
//             const pv = Number(p.precioVenta || 0);
//             const pc = Number(p.precioCosto || 0);

//             ingresoReal += vendidos * pv;
//             gananciaReal += Number(p.gananciaHoy || (vendidos * (pv - pc)));
//             costoVendido += vendidos * pc;

//             const stockFinal =
//                 (typeof p.stockFinal !== "undefined" && p.stockFinal !== null)
//                     ? Number(p.stockFinal)
//                     : null;

//             if (stockFinal !== null) {
//                 ventaEsperadaDelDia += stockFinal * pv;
//             }
//         });

//         const ventaTotal =
//             (Number(registro.turnos.mañana.venta) || 0) +
//             (Number(registro.turnos.tarde.venta) || 0);

//         return {
//             ingresoReal,
//             gananciaReal,
//             ventaTotal,
//             costoVendido,
//             ventaEsperadaDelDia,
//             registro
//         };
//     }

//     // ======================================================================
//     // HISTORIALES
//     // ======================================================================

//     obtenerRegistros() {
//         const registros = Object.keys(localStorage)
//             .filter(k => k.startsWith(`registro_${this.usuario}_`))
//             .map(k => ({
//                 clave: k,
//                 datos: JSON.parse(localStorage.getItem(k)) || []
//             }));
//         registros.forEach(r => {
//             r.datos = (r.datos || []).map(obj => Object.assign({}, obj));
//         });
//         return registros;
//     }

//     cerrarDia(fechaStr) {
//         const fecha = fechaStr || this._fechaHoyStr();
//         const claveDiario = this.prefijoDiario + fecha;
//         const registro = JSON.parse(localStorage.getItem(claveDiario));
//         if (!registro) return false;

//         const ahora = new Date();
//         const hh = String(ahora.getHours()).padStart(2, "0");
//         const mm = String(ahora.getMinutes()).padStart(2, "0");
//         const ss = String(ahora.getSeconds()).padStart(2, "0");
//         const claveHist = `registro_${this.usuario}_${fecha}_${hh}${mm}${ss}`;

//         const historialProductos =
//             Object.values(registro.productos || {}).map(p => ({
//                 id: p.id,
//                 nombre: p.nombre,
//                 categoria: p.categoria,
//                 stockInicial: p.stockInicial || null,
//                 stockFinal:
//                     (typeof p.stockFinal !== "undefined") ? p.stockFinal : null,
//                 vendido: Number(p.vendidosHoy || 0),
//                 precioVenta: Number(p.precioVenta || 0),
//                 precioCosto: Number(p.precioCosto || 0),
//                 gananciaDia: Number(p.gananciaHoy || 0),
//                 ingreso: Number(p.ingreso || 0)
//             }));

//         localStorage.setItem(claveHist, JSON.stringify(historialProductos));

//         const nuevo = this._crearRegistroDiarioBase(fecha);
//         this.guardarRegistroDiario(nuevo, fecha);

//         return true;
//     }

//     // ======================================================================
//     // PROMEDIOS
//     // ======================================================================

//     calcularPromedios() {

//         const registrosHistoricos = this.obtenerRegistros();
//         const registroDiario = this.obtenerRegistroDiario();

//         const acumulador = {};

//         registrosHistoricos.forEach(reg => {
//             (reg.datos || []).forEach(prod => {

//                 if (!acumulador[prod.nombre]) {
//                     acumulador[prod.nombre] = { total: 0, dias: 0 };
//                 }

//                 acumulador[prod.nombre].total += (prod.vendido || 0);
//             });
//         });

//         const diasHistoricos = Math.max(1, registrosHistoricos.length);

//         Object.keys(acumulador).forEach(nombre => {
//             acumulador[nombre].dias = diasHistoricos;
//         });

//         if (registroDiario && registroDiario.productos) {
//             Object.values(registroDiario.productos).forEach(prod => {
//                 if (!acumulador[prod.nombre]) {
//                     acumulador[prod.nombre] = { total: 0, dias: diasHistoricos };
//                 }
//                 acumulador[prod.nombre].total += (prod.vendidosHoy || 0);
//             });
//         }

//         const resultado = {};

//         Object.keys(acumulador).forEach(nombre => {
//             const datos = acumulador[nombre];
//             const promedio = datos.total / datos.dias;
//             resultado[nombre] = Number(promedio.toFixed(2));
//         });

//         return resultado;
//     }
// }

// // ======================================================================
// // EXPORTADOR / IMPORTADOR
// // ======================================================================

// export class Exportador {
//     static exportarCSV(productos) {
//         let csv = "Nombre,Categoría,Stock,Precio Costo,Precio Venta,Vendidos\n";
//         productos.forEach(p => {
//             csv += `${p.nombre},${p.categoria},${p.stock},${p.precioCosto},${p.precioVenta},${p.vendido}\n`;
//         });
//         return csv;
//     }

//     static descargarArchivo(contenido, nombre, tipo) {
//         const blob = new Blob([contenido], { type: tipo });
//         const link = document.createElement("a");
//         link.href = URL.createObjectURL(blob);
//         link.download = nombre;
//         link.click();
//     }
// }

// export class Importador {
//     static parsearCSV(csv) {
//         const lineas = csv.split("\n").map(l => l.trim()).filter(l => l.length > 0);
//         const productos = [];
//         if (lineas.length < 2) return productos;

//         const encabezados = lineas[0].split(",").map(h => h.trim().toLowerCase());

//         for (let i = 1; i < lineas.length; i++) {
//             const valores = lineas[i].split(",").map(v => v.trim());
//             const prodData = {};
//             encabezados.forEach((enc, idx) => {
//                 prodData[enc] = valores[idx] || "";
//             });

//             const producto = new Producto(
//                 Date.now() + i,
//                 prodData["nombre"] || "Producto",
//                 prodData["categoría"] || "",
//                 parseFloat(prodData["precio costo"]) || 0,
//                 parseFloat(prodData["precio venta"]) || 0,
//                 parseInt(prodData["stock"], 10) || 0,
//                 parseInt(prodData["stock"], 10) || 0,
//                 parseInt(prodData["vendidos"], 10) || 0
//             );
//             productos.push(producto);
//         }

//         return productos;
//     }
// }



// MODELOS - PROGRAMACIÓN ORIENTADA A OBJETOS

// ======================================================================
// PRODUCTO
// ======================================================================

export class Producto {
    constructor(id, nombre, categoria, precioCosto, precioVenta, stockInicial, stock, vendido = 0) {
        this.id = id;
        this.nombre = nombre;
        this.categoria = categoria;
        this.precioCosto = precioCosto || 0;
        this.precioVenta = precioVenta || 0;

        this.stockInicial =
            (typeof stockInicial === 'number')
                ? stockInicial
                : (typeof stock === 'number' ? stock : 0);

        this.stock =
            (typeof stock === 'number')
                ? stock
                : (this.stockInicial || 0);

        this.vendido = vendido || 0;
    }

    calcularGananciaUnidad() {
        return (this.precioVenta || 0) - (this.precioCosto || 0);
    }

    calcularGananciaTotal() {
        return (this.vendido || 0) * this.calcularGananciaUnidad();
    }

    calcularIngresoEsperado() {
        return (this.stockInicial || 0) * (this.precioVenta || 0);
    }

    disminuirStock() {
        if ((this.stock || 0) <= 0) return false;
        this.stock = (this.stock || 0) - 1;
        this.vendido = (this.vendido || 0) + 1;
        return true;
    }

    aumentarStock(cantidad) {
        cantidad = Number(cantidad) || 0;
        this.stock = (this.stock || 0) + cantidad;
        this.stockInicial = (this.stockInicial || 0) + cantidad;
    }

    registrarVenta() {
        return this.disminuirStock();
    }

    devolverVenta() {
        if ((this.vendido || 0) <= 0) return false;
        this.vendido--;
        this.stock++;
        return true;
    }

    reiniciarVendidos() {
        this.vendido = 0;
    }
}

// ======================================================================
// INVENTARIO
// ======================================================================

export class Inventario {
    constructor(usuarioActivo) {
        this.clave = `productos_${usuarioActivo}`;
        this.productos = this.cargar();
    }

    cargar() {
        const guardados = JSON.parse(localStorage.getItem(this.clave)) || [];
        return guardados.map(p => Object.assign(new Producto(), p));
    }

    guardar() {
        localStorage.setItem(this.clave, JSON.stringify(this.productos));
    }

    obtenerTodos() {
        return this.productos;
    }

    buscarPorId(id) {
        return this.productos.find(p => p.id === id);
    }

    agregarProducto(producto) {
        this.productos.push(producto);
        this.guardar();
    }

    eliminarProducto(id) {
        this.productos = this.productos.filter(p => p.id !== id);
        this.guardar();
    }

    registrarVenta(id) {
        const prod = this.buscarPorId(id);
        if (prod && prod.registrarVenta()) {
            this.guardar();
            return true;
        }
        return false;
    }

    devolverVenta(id) {
        const prod = this.buscarPorId(id);
        if (prod && prod.devolverVenta()) {
            this.guardar();
            return true;
        }
        return false;
    }

    sumarStock(id, cantidad) {
        const prod = this.buscarPorId(id);
        if (!prod) return false;
        prod.aumentarStock(cantidad);
        this.guardar();
    }

    calcularTotales() {
        let costoTotal = 0;
        let ventaEsperada = 0;
        let ingresoReal = 0;
        let gananciaReal = 0;

        this.productos.forEach(p => {
            costoTotal += (p.stockInicial || 0) * (p.precioCosto || 0);
            ventaEsperada += p.calcularIngresoEsperado();
            ingresoReal += (p.vendido || 0) * (p.precioVenta || 0);
            gananciaReal += p.calcularGananciaTotal();
        });

        return { costoTotal, ventaEsperada, ingresoReal, gananciaReal };
    }
}

// ======================================================================
// USUARIO SESION
// ======================================================================

export class UsuarioSesion {
    constructor() {
        this.usuarioActivo = localStorage.getItem("usuarioActivo") || null;
        this._claveUltimaActividad = "ultimaActividad";
        this._monitorId = null;
        this._listenersAct = [];
    }

    login(usuario, password) {
        const usuariosValidos = {
            "admin": "1234",
            "vendedor": "1234",
            "cristian": "1234",
            "karen": "1234",
            "estela": "1234"
        };

        if (usuariosValidos[usuario] === password) {
            localStorage.setItem("usuarioActivo", usuario);
            const ahora = Date.now();
            localStorage.setItem(this._claveUltimaActividad, String(ahora));
            this.usuarioActivo = usuario;
            return true;
        }
        return false;
    }

    cerrarSesion() {
        this.detenerMonitor();
        localStorage.removeItem("usuarioActivo");
        localStorage.removeItem(this._claveUltimaActividad);
        location.href = "login.html";
    }

    estaLogueado() {
        this.usuarioActivo = localStorage.getItem("usuarioActivo") || null;
        return this.usuarioActivo !== null;
    }

    registrarActividad() {
        localStorage.setItem(this._claveUltimaActividad, String(Date.now()));
    }

    obtenerUltimaActividad() {
        const v = localStorage.getItem(this._claveUltimaActividad);
        return v ? parseInt(v, 10) : null;
    }

    iniciarMonitor(inactividadMinutos = 15, onExpirar = null) {
        if (this._monitorId) return;

        const actualizar = () => this.registrarActividad();
        this._listenersAct = ["click", "keydown", "mousemove", "touchstart"];
        this._listenersAct.forEach(ev => window.addEventListener(ev, actualizar));

        const intervalo = 15000;
        const timeout = inactividadMinutos * 60000;

        this._monitorId = setInterval(() => {
            const ultima = this.obtenerUltimaActividad();
            if (!ultima) {
                this.registrarActividad();
                return;
            }

            if (Date.now() - ultima > timeout) {
                this.detenerMonitor();
                localStorage.removeItem("usuarioActivo");
                localStorage.removeItem(this._claveUltimaActividad);
                if (onExpirar) onExpirar();
                else {
                    alert("Sesión expirada por inactividad.");
                    location.href = "login.html";
                }
            }
        }, intervalo);
    }

    detenerMonitor() {
        if (this._monitorId) clearInterval(this._monitorId);
        this._monitorId = null;
        const actualizar = () => this.registrarActividad();
        this._listenersAct.forEach(ev => window.removeEventListener(ev, actualizar));
        this._listenersAct = [];
    }
}

// ======================================================================
// TURNOS
// ======================================================================

export class Turnos {
    constructor(usuario) {
        this.clave = `turnos_${usuario}`;
        this.default = {
            mañana: { inicio: "06:00", fin: "14:00" },
            tarde: { inicio: "15:00", fin: "23:00" }
        };
        this.config = JSON.parse(localStorage.getItem(this.clave)) || this.default;
    }

    guardar() {
        localStorage.setItem(this.clave, JSON.stringify(this.config));
    }

    obtenerTurnoActual() {
        const ahora = new Date();
        const hora = ahora.getHours() + ahora.getMinutes() / 60;

        const m = this.config.mañana;
        const t = this.config.tarde;

        const parseHora = (str) => {
            if (!str) return 0;
            const parts = String(str).split(":");
            return parseInt(parts[0] || 0, 10) + (parseInt(parts[1] || 0, 10) / 60);
        };

        const hM1 = parseHora(m.inicio);
        const hM2 = parseHora(m.fin);
        const hT1 = parseHora(t.inicio);
        const hT2 = parseHora(t.fin);

        if (hora >= hM1 && hora <= hM2) return "mañana";
        if (hora >= hT1 && hora <= hT2) return "tarde";

        return "fuera";
    }
}

// ======================================================================
// ESTADISTICAS
// ======================================================================

export class Estadisticas {
    constructor(usuario) {
        this.usuario = usuario;
        this.prefijoDiario = `registro_diario_${this.usuario}_`;
        this.prefijoHist = `registro_${this.usuario}_`;
    }

    _fechaHoyStr() {
        const fecha = new Date();
        const yyyy = fecha.getFullYear();
        const mm = String(fecha.getMonth() + 1).padStart(2, "0");
        const dd = String(fecha.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    obtenerRegistroDiario(fechaStr) {
        const fecha = fechaStr || this._fechaHoyStr();
        const clave = this.prefijoDiario + fecha;
        return JSON.parse(localStorage.getItem(clave)) || null;
    }

    _crearRegistroDiarioBase(fechaStr) {
        const fecha = fechaStr || this._fechaHoyStr();
        return {
            fecha,
            turnos: {
                mañana: { venta: 0, ganancia: 0 },
                tarde: { venta: 0, ganancia: 0 }
            },
            productos: {}
        };
    }

    guardarRegistroDiario(registro, fechaStr) {
        const fecha = fechaStr || registro.fecha || this._fechaHoyStr();
        const clave = this.prefijoDiario + fecha;
        localStorage.setItem(clave, JSON.stringify(registro));
    }

    // ====================================================
    //  TU FUNCIÓN ORIGINAL (SIN CAMBIAR)
    // ====================================================

    actualizarVentaEnDiario(productoInfo, turno = "mañana") {
        const fecha = this._fechaHoyStr();
        const clave = this.prefijoDiario + fecha;

        let registro = JSON.parse(localStorage.getItem(clave));
        if (!registro) registro = this._crearRegistroDiarioBase(fecha);

        const t = (turno === "tarde") ? "tarde" : "mañana";

        const cantidad = Number(productoInfo.cantidad) || 0;
        const ganancia = Number(productoInfo.ganancia) || 0;
        const precioVenta = Number(productoInfo.precioVenta || 0);
        const precioCosto = Number(productoInfo.precioCosto || 0);

        registro.turnos[t].venta = (registro.turnos[t].venta || 0) + cantidad;
        registro.turnos[t].ganancia = (registro.turnos[t].ganancia || 0) + ganancia;

        if (registro.turnos[t].venta < 0) registro.turnos[t].venta = 0;
        if (registro.turnos[t].ganancia < 0) registro.turnos[t].ganancia = 0;

        const pid = String(productoInfo.id);

        registro.productos[pid] = registro.productos[pid] || {
            id: productoInfo.id,
            nombre: productoInfo.nombre,
            categoria: productoInfo.categoria || "",
            stockInicial: (typeof productoInfo.stockInicial !== "undefined") ? Number(productoInfo.stockInicial) : null,
            stockFinal: (typeof productoInfo.stockFinal !== "undefined") ? Number(productoInfo.stockFinal) : null,
            vendidosHoy: 0,
            gananciaHoy: 0,
            precioVenta: precioVenta || 0,
            precioCosto: precioCosto || 0,
            ingreso: 0
        };

        if (typeof productoInfo.stockInicial !== "undefined" && registro.productos[pid].stockInicial === null) {
            registro.productos[pid].stockInicial = Number(productoInfo.stockInicial);
        }
        if (typeof productoInfo.stockFinal !== "undefined") {
            registro.productos[pid].stockFinal = Number(productoInfo.stockFinal);
        }

        registro.productos[pid].vendidosHoy =
            (registro.productos[pid].vendidosHoy || 0) + cantidad;

        registro.productos[pid].gananciaHoy =
            (registro.productos[pid].gananciaHoy || 0) + ganancia;

        if (registro.productos[pid].vendidosHoy < 0) registro.productos[pid].vendidosHoy = 0;
        if (registro.productos[pid].gananciaHoy < 0) registro.productos[pid].gananciaHoy = 0;

        const pv = Number(registro.productos[pid].precioVenta) || 0;
        registro.productos[pid].ingreso =
            registro.productos[pid].vendidosHoy * pv;

        this.guardarRegistroDiario(registro, fecha);
    }

    // ====================================================
    //  TOTALES DEL DÍA - CORREGIDO
    // ====================================================

    calcularTotalesDelDia(fechaStr) {
        const registro = this.obtenerRegistroDiario(fechaStr);
        if (!registro)
            return {
                ingresoReal: 0,
                gananciaReal: 0,
                ventaTotal: 0,
                costoVendido: 0,
                ventaEsperadaDelDia: 0
            };

        let ingresoReal = 0;
        let gananciaReal = 0;
        let costoVendido = 0;
        let ventaEsperadaDelDia = 0;

        Object.values(registro.productos || {}).forEach(p => {
            const vendidos = Number(p.vendidosHoy || 0);
            const pv = Number(p.precioVenta || 0);
            const pc = Number(p.precioCosto || 0);

            ingresoReal += vendidos * pv;
            gananciaReal += Number(p.gananciaHoy || (vendidos * (pv - pc)));
            costoVendido += vendidos * pc;

            const stockFinal =
                (typeof p.stockFinal !== "undefined" && p.stockFinal !== null)
                    ? Number(p.stockFinal)
                    : 0;

            ventaEsperadaDelDia += stockFinal * pv;
        });

        const ventaTotal =
            (Number(registro.turnos.mañana.venta) || 0) +
            (Number(registro.turnos.tarde.venta) || 0);

        return {
            ingresoReal,
            gananciaReal,
            ventaTotal,
            costoVendido,
            ventaEsperadaDelDia,
            registro
        };
    }

    // ====================================================
    // HISTORIALES (CORREGIDO)
    // ====================================================

    obtenerRegistros() {
        const claves = Object.keys(localStorage)
            .filter(k => k.startsWith(this.prefijoHist))
            .map(k => ({
                clave: k,
                datos: JSON.parse(localStorage.getItem(k)) || []
            }));

        claves.forEach(r => {
            r.datos = (r.datos || []).map(obj => Object.assign({}, obj));
        });

        return claves;
    }

    cerrarDia(fechaStr) {
        const fecha = fechaStr || this._fechaHoyStr();
        const claveDiario = this.prefijoDiario + fecha;
        const registro = JSON.parse(localStorage.getItem(claveDiario));
        if (!registro) return false;

        const ahora = new Date();
        const hh = String(ahora.getHours()).padStart(2, "0");
        const mm = String(ahora.getMinutes()).padStart(2, "0");
        const ss = String(ahora.getSeconds()).padStart(2, "0");
        const claveHist = `${this.prefijoHist}${fecha}_${hh}${mm}${ss}`;

        const historialProductos =
            Object.values(registro.productos || {}).map(p => ({
                id: p.id,
                nombre: p.nombre,
                categoria: p.categoria,
                stockInicial: p.stockInicial || null,
                stockFinal:
                    (typeof p.stockFinal !== "undefined") ? p.stockFinal : null,
                vendido: Number(p.vendidosHoy || 0),
                precioVenta: Number(p.precioVenta || 0),
                precioCosto: Number(p.precioCosto || 0),
                gananciaDia: Number(p.gananciaHoy || 0),
                ingreso: Number(p.ingreso || 0)
            }));

        localStorage.setItem(claveHist, JSON.stringify(historialProductos));

        const nuevo = this._crearRegistroDiarioBase(fecha);
        this.guardarRegistroDiario(nuevo, fecha);

        return true;
    }

    // ====================================================
    //  PROMEDIOS
    // ====================================================

    calcularPromedios() {
        const registrosHistoricos = this.obtenerRegistros();
        const registroDiario = this.obtenerRegistroDiario();

        const acumulador = {};

        registrosHistoricos.forEach(reg => {
            (reg.datos || []).forEach(prod => {

                if (!acumulador[prod.nombre]) {
                    acumulador[prod.nombre] = { total: 0, dias: 0 };
                }

                acumulador[prod.nombre].total += (prod.vendido || 0);
            });
        });

        const diasHistoricos = Math.max(1, registrosHistoricos.length);

        Object.keys(acumulador).forEach(nombre => {
            acumulador[nombre].dias = diasHistoricos;
        });

        if (registroDiario && registroDiario.productos) {
            Object.values(registroDiario.productos).forEach(prod => {
                if (!acumulador[prod.nombre]) {
                    acumulador[prod.nombre] = { total: 0, dias: diasHistoricos };
                }
                acumulador[prod.nombre].total += (prod.vendidosHoy || 0);
            });
        }

        const resultado = {};

        Object.keys(acumulador).forEach(nombre => {
            const datos = acumulador[nombre];
            resultado[nombre] = Number((datos.total / datos.dias).toFixed(2));
        });

        return resultado;
    }

    // ====================================================
    // RESETEAR ESTADÍSTICAS
    // ====================================================
    resetearEstadisticas() {
        const claves = Object.keys(localStorage);

        claves.forEach(k => {
            if (k.startsWith(this.prefijoDiario) || k.startsWith(this.prefijoHist)) {
                localStorage.removeItem(k);
            }
        });

        // Crear registro limpio del día
        const base = this._crearRegistroDiarioBase();
        this.guardarRegistroDiario(base);

        return true;
    }
}

// ======================================================================
// EXPORTADOR / IMPORTADOR
// ======================================================================

export class Exportador {
    static exportarCSV(productos) {
        let csv = "Nombre,Categoría,Stock,Precio Costo,Precio Venta,Vendidos\n";
        productos.forEach(p => {
            csv += `${p.nombre},${p.categoria},${p.stock},${p.precioCosto},${p.precioVenta},${p.vendido}\n`;
        });
        return csv;
    }

    static descargarArchivo(contenido, nombre, tipo) {
        const blob = new Blob([contenido], { type: tipo });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = nombre;
        link.click();
    }
}

export class Importador {
    static parsearCSV(csv) {
        const lineas = csv.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        const productos = [];
        if (lineas.length < 2) return productos;

        const encabezados = lineas[0].split(",").map(h => h.trim().toLowerCase());

        for (let i = 1; i < lineas.length; i++) {
            const valores = lineas[i].split(",").map(v => v.trim());
            const prodData = {};
            encabezados.forEach((enc, idx) => {
                prodData[enc] = valores[idx] || "";
            });

            const producto = new Producto(
                Date.now() + i,
                prodData["nombre"] || "Producto",
                prodData["categoría"] || "",
                parseFloat(prodData["precio costo"]) || 0,
                parseFloat(prodData["precio venta"]) || 0,
                parseInt(prodData["stock"], 10) || 0,
                parseInt(prodData["stock"], 10) || 0,
                parseInt(prodData["vendidos"], 10) || 0
            );
            productos.push(producto);
        }

        return productos;
    }
}
