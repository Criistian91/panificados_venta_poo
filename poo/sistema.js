import { Producto, Inventario, UsuarioSesion, Turnos, Estadisticas, Exportador } from "./modelos.js";

export class SistemaPanificados {

    constructor() {
        this.sesion = new UsuarioSesion();

        if (!this.sesion.estaLogueado()) {
            alert("Debe iniciar sesión.");
            location.href = "login.html";
            return;
        }

        this.inventario = new Inventario(this.sesion.usuarioActivo);
        this.turnos = new Turnos(this.sesion.usuarioActivo);
        this.estadisticas = new Estadisticas(this.sesion.usuarioActivo);

        this.mostrarPrecios = false;
        this.categoriaSeleccionada = "";
    }

    iniciarSistema() {
        this.configurarEventosUI();

        // iniciar monitor de sesión: 10 minutos de inactividad
        try {
            this.sesion.iniciarMonitor(10, () => {
                alert("Tu sesión expiró por inactividad (15 min). Vas a ser redirigido al login.");
                location.href = "login.html";
            });
        } catch (e) {
            console.warn("No se pudo iniciar monitor de sesión:", e);
        }

        this.cargarProductosEnPantalla();
        this.actualizarCategorias();
        this.cargarHorarios();
        console.log("Sistema iniciado correctamente.");
    }

    configurarEventosUI() {
        const toggleBtn = document.getElementById("togglePreciosBtn");
        if (toggleBtn) toggleBtn.addEventListener("click", () => {
            this.mostrarPrecios = !this.mostrarPrecios;
            this.cargarProductosEnPantalla();
        });

        const cerrarBtn = document.getElementById("cerrarSesionBtn");
        if (cerrarBtn) {
            cerrarBtn.addEventListener("click", () => {
                this.guardarRegistroHistorico(true);
                this.sesion.cerrarSesion();
            });
        }

        const addBtn = document.getElementById("addStockBtn") || document.getElementById("crearProductoBtn");
        if (addBtn) addBtn.addEventListener("click", () => {
            this.mostrarModalNuevoProducto();
        });

        const crearBtn = document.getElementById("btnCrearProducto");
        if (crearBtn) crearBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.crearProductoDesdeFormulario();
        });

        const btnAgregarCat = document.getElementById("btnAgregarCategoria");
        if (btnAgregarCat) btnAgregarCat.addEventListener("click", (e) => {
            e.preventDefault();
            this.agregarCategoriaDesdeInput();
        });

        const cierreBtn = document.getElementById("cierreDiaBtn");
        if (cierreBtn) cierreBtn.addEventListener("click", () => {
            if (confirm("¿Deseás cerrar el día y archivar las ventas diarias?")) {
                this.cierreDelDia();
            }
        });

        const form = document.getElementById("formularioNuevoProducto");
        if (form) {
            form.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") {
                    ev.preventDefault();
                    const crear = document.getElementById("btnCrearProducto");
                    if (crear) crear.click();
                }
            });
        }
    }

    //--------------------------------------------------------------------
    // LISTA DE PRODUCTOS
    //--------------------------------------------------------------------

    cargarProductosEnPantalla() {
        const cont = document.getElementById("productosContainer");
        if (!cont) return;
        cont.innerHTML = "";

        const prodList = this.inventario.obtenerTodos().map(p =>
            Object.assign(new Producto(), p)
        );

        this.crearSelectCategorias(prodList);

        const filtrados = this.categoriaSeleccionada
            ? prodList.filter(p => p.categoria === this.categoriaSeleccionada)
            : prodList;

        filtrados.forEach(p => {
            const caja = document.createElement("div");
            caja.className = "producto-item";

            let html = `
                <h3>${p.nombre}</h3>
                <p>Stock: ${p.stock}</p>
                <p>Categoría: ${p.categoria || '(sin categoría)'}</p>
            `;

            if (this.mostrarPrecios) {
                html += `
                    <p>Precio costo: $${p.precioCosto}</p>
                    <p>Precio venta: $${p.precioVenta}</p>
                `;
            }

            const acciones = document.createElement("div");
            acciones.className = "acciones";

            const btnVender = document.createElement("button");
            btnVender.textContent = "Vender";
            btnVender.addEventListener("click", () => this.registrarVenta(p.id));

            const btnDevolver = document.createElement("button");
            btnDevolver.textContent = "Devolver";
            btnDevolver.addEventListener("click", () => this.devolverProducto(p.id));

            const btnSumar = document.createElement("button");
            btnSumar.textContent = "Sumar stock";
            btnSumar.addEventListener("click", () => this.sumarStock(p.id));

            const btnEliminar = document.createElement("button");
            btnEliminar.textContent = "Eliminar";
            btnEliminar.addEventListener("click", () => {
                if (confirm("¿Seguro que querés eliminar el producto?")) {
                    this.eliminarProducto(p.id);
                    this.actualizarCategorias();
                }
            });

            acciones.appendChild(btnVender);
            acciones.appendChild(btnDevolver);
            acciones.appendChild(btnSumar);
            acciones.appendChild(btnEliminar);

            caja.innerHTML = html;
            caja.appendChild(acciones);
            cont.appendChild(caja);
        });

        this.mostrarTotales();
    }

    //--------------------------------------------------------------------
    // CATEGORÍAS
    //--------------------------------------------------------------------

    crearSelectCategorias(productos) {
        let select = document.getElementById("selectCategorias");

        if (!select) {
            select = document.createElement("select");
            select.id = "selectCategorias";
            const cont = document.getElementById("productosContainer");
            if (cont) cont.before(select);
        }

        const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

        select.innerHTML = `<option value="">Todas las categorías</option>`;
        categorias.forEach(cat => {
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        select.value = this.categoriaSeleccionada;

        select.replaceWith(select.cloneNode(true));
        select = document.getElementById("selectCategorias");
        if (select) {
            select.addEventListener("change", () => {
                this.categoriaSeleccionada = select.value;
                this.cargarProductosEnPantalla();
            });
        }
    }

    actualizarCategorias() {
        const productos = this.inventario.obtenerTodos().map(
            p => Object.assign(new Producto(), p)
        );

        const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

        const select = document.getElementById("categoriaNueva");
        const selectVista = document.getElementById("selectCategorias");

        if (select) {
            select.innerHTML = `<option value="">(Seleccionar categoría)</option>`;
            categorias.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat;
                opt.textContent = cat;
                select.appendChild(opt);
            });
        }

        if (selectVista) {
            selectVista.innerHTML = `<option value="">Todas las categorías</option>`;
            categorias.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat;
                opt.textContent = cat;
                selectVista.appendChild(opt);
            });
            selectVista.value = this.categoriaSeleccionada || "";
        }
    }

    //--------------------------------------------------------------------
    // MODAL CREAR PRODUCTO
    //--------------------------------------------------------------------

    mostrarModalNuevoProducto() {
        const form = document.getElementById("formularioNuevoProducto");
        if (!form) {
            console.error("No se encontró el formulario en index.html");
            return;
        }

        this.actualizarCategorias();

        form.style.display = form.style.display === "block" ? "none" : "block";
        if (form.style.display === "block") {
            const nombre = document.getElementById("nombreInput");
            if (nombre) nombre.focus();
            form.scrollIntoView({ behavior: "smooth" });
        }
    }

    agregarCategoriaDesdeInput() {
        const input = document.getElementById("categoriaAgregar");
        const select = document.getElementById("categoriaNueva");
        if (!input || !select) return;

        const valor = (input.value || "").trim();
        if (!valor) return alert("Ingresá el nombre de la categoría.");

        const existing = Array.from(select.options)
            .some(o => o.value.toLowerCase() === valor.toLowerCase());
        if (existing) {
            alert("La categoría ya existe.");
            input.value = "";
            return;
        }

        const opt = document.createElement("option");
        opt.value = valor;
        opt.textContent = valor;
        select.appendChild(opt);
        select.value = valor;

        input.value = "";
        alert("Categoría agregada.");
    }

    //--------------------------------------------------------------------
    // CREAR PRODUCTO
    //--------------------------------------------------------------------

    crearProductoDesdeFormulario() {
        const nombreEl = document.getElementById('nombreInput');
        const precioCostoEl = document.getElementById('precioCostoInput');
        const precioVentaEl = document.getElementById('precioVentaInput');
        const stockEl = document.getElementById('stockInput');
        const categoriaSel = document.getElementById('categoriaNueva');

        if (!nombreEl || !precioCostoEl || !precioVentaEl || !stockEl || !categoriaSel) {
            return alert("Formulario incompleto o elementos faltantes en el DOM.");
        }

        const nombre = nombreEl.value.trim();
        if (!nombre) return alert('El nombre es obligatorio.');

        const precioCosto = parseFloat(precioCostoEl.value) || 0;
        const precioVenta = parseFloat(precioVentaEl.value) || 0;
        const stockInicial = parseInt(stockEl.value, 10) || 0;
        const categoria = (categoriaSel.value || "").trim();

        const nuevo = new Producto(
            Date.now(),
            nombre,
            categoria,
            precioCosto,
            precioVenta,
            stockInicial,
            stockInicial,
            0
        );

        this.inventario.agregarProducto(nuevo);
        this.cargarProductosEnPantalla();
        this.actualizarCategorias();

        nombreEl.value = "";
        precioCostoEl.value = "";
        precioVentaEl.value = "";
        stockEl.value = "";
        const catTxt = document.getElementById("categoriaAgregar");
        if (catTxt) catTxt.value = "";

        alert('Producto creado correctamente.');
    }

    //--------------------------------------------------------------------
    // REGISTRAR VENTA (CORREGIDO Y COMPLETO)
    //--------------------------------------------------------------------

    registrarVenta(id) {
        const prod = this.inventario.buscarPorId(id);
        if (!prod || prod.stock <= 0) return;

        const stockAntes = Number(prod.stock);

        // Inventario maneja stock-- y vendido++
        if (this.inventario.registrarVenta(id)) {

            const stockDespues = Number(prod.stock);
            const turno = this.turnos.obtenerTurnoActual() || 'mañana';

            const gananciaUnidad = (prod.precioVenta || 0) - (prod.precioCosto || 0);

            this.estadisticas.actualizarVentaEnDiario({
                id: prod.id,
                nombre: prod.nombre,
                categoria: prod.categoria || "",
                cantidad: 1,
                ganancia: gananciaUnidad,
                precioVenta: prod.precioVenta,
                precioCosto: prod.precioCosto,
                stockInicial: stockAntes,
                stockFinal: stockDespues
            }, turno);

            if (typeof this.mostrarTotales === "function") this.mostrarTotales();
            document.dispatchEvent(new Event("ventasActualizadas"));

            this.cargarProductosEnPantalla();
        }
    }

    //--------------------------------------------------------------------
    // DEVOLVER VENTA (CORREGIDO Y COMPLETO)
    //--------------------------------------------------------------------

    devolverProducto(id) {
        const prod = this.inventario.buscarPorId(id);
        if (!prod || prod.vendido <= 0) return;

        const stockAntes = Number(prod.stock);

        if (this.inventario.devolverVenta(id)) {

            const stockDespues = Number(prod.stock);
            const turno = this.turnos.obtenerTurnoActual() || 'mañana';

            const gananciaUnidad = (prod.precioVenta || 0) - (prod.precioCosto || 0);

            this.estadisticas.actualizarVentaEnDiario({
                id: prod.id,
                nombre: prod.nombre,
                categoria: prod.categoria || "",
                cantidad: -1,
                ganancia: -gananciaUnidad,
                precioVenta: prod.precioVenta,
                precioCosto: prod.precioCosto,
                stockInicial: stockAntes,
                stockFinal: stockDespues
            }, turno);

            if (typeof this.mostrarTotales === "function") this.mostrarTotales();
            document.dispatchEvent(new Event("ventasActualizadas"));

            this.cargarProductosEnPantalla();
        }
    }

    //--------------------------------------------------------------------
    // STOCK / ELIMINAR
    //--------------------------------------------------------------------

    sumarStock(id) {
        const cantidad = parseInt(prompt("¿Cuántas unidades agregar?"), 10);
        if (cantidad > 0) {
            this.inventario.sumarStock(id, cantidad);
            this.cargarProductosEnPantalla();
        }
    }

    eliminarProducto(id) {
        if (confirm("¿Seguro que querés eliminar el producto?")) {
            this.inventario.eliminarProducto(id);
            this.cargarProductosEnPantalla();
            this.actualizarCategorias();
        }
    }

    //--------------------------------------------------------------------
    // TOTALES
    //--------------------------------------------------------------------

    mostrarTotales() {
        const tot = this.inventario.calcularTotales();
        const diarios = this.estadisticas.calcularTotalesDelDia();
        const cont = document.getElementById("totalesContainer");
        if (!cont) return;

        cont.innerHTML = `
            <p><strong>Costo total:</strong> $${tot.costoTotal}</p>
            <p><strong>Venta esperada:</strong> $${tot.ventaEsperada}</p>
            <p><strong>Ingreso real (hoy):</strong> $${diarios.ingresoReal}</p>
            <p><strong>Ganancia real (hoy):</strong> $${diarios.gananciaReal}</p>
        `;
    }

    //--------------------------------------------------------------------
    // TURNOS
    //--------------------------------------------------------------------

    cargarHorarios() {
        const cfg = this.turnos.config;
        try {
            document.getElementById("inicioManana").value = cfg.mañana.inicio;
            document.getElementById("finManana").value = cfg.mañana.fin;
            document.getElementById("inicioTarde").value = cfg.tarde.inicio;
            document.getElementById("finTarde").value = cfg.tarde.fin;
        } catch (e) { }
    }

    //--------------------------------------------------------------------
    // REGISTRO HISTÓRICO / CIERRE DEL DÍA
    //--------------------------------------------------------------------

    guardarRegistroHistorico(omitReset = false) {
        try {
            const productosSnapshot = this.inventario.obtenerTodos().map(p => ({
                id: p.id,
                nombre: p.nombre,
                categoria: p.categoria,
                precioCosto: p.precioCosto,
                precioVenta: p.precioVenta,
                stockInicial: p.stockInicial,
                stock: p.stock,
                vendido: p.vendido || 0
            }));

            const hayVentas = productosSnapshot.some(p => (p.vendido || 0) > 0);
            if (!hayVentas) {
                console.log("No hay ventas en la sesión actual: no se guarda registro histórico.");
                return;
            }

            const fecha = new Date();
            const yyyy = fecha.getFullYear();
            const mm = String(fecha.getMonth() + 1).padStart(2, "0");
            const dd = String(fecha.getDate()).padStart(2, "0");
            const hh = String(fecha.getHours()).padStart(2, "0");
            const min = String(fecha.getMinutes()).padStart(2, "0");
            const ss = String(fecha.getSeconds()).padStart(2, "0");

            const clave = `registro_${this.sesion.usuarioActivo}_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;

            localStorage.setItem(clave, JSON.stringify(productosSnapshot));
            console.log("Registro histórico guardado:", clave);

            if (!omitReset) {
                this.inventario.productos.forEach(p => { p.vendido = 0; });
                this.inventario.guardar();
            }

        } catch (e) {
            console.error("Error guardando registro histórico:", e);
        }
    }

    cierreDelDia() {
        try {
            const ok = this.estadisticas.cerrarDia();
            if (ok) {
                alert("Cierre del día realizado y archivado.");

                if (typeof this.mostrarTotales === 'function') this.mostrarTotales();
                document.dispatchEvent(new Event('ventasActualizadas'));
                this.cargarProductosEnPantalla();
            } else {
                alert("No había registro diario para cerrar.");
            }
        } catch (e) {
            console.error("Error en cierre del día:", e);
            alert("Error al cerrar el día. Revisá la consola.");
        }
    }
}
