import { Inventario, Estadisticas as EstadModel, UsuarioSesion, Producto } from './modelos.js';

class VistaEstadisticas {
    constructor(usuario = null) {

        this.sesion = new UsuarioSesion();
        if (!this.sesion.estaLogueado()) {
            alert('Debes iniciar sesión para ver las estadísticas.');
            location.href = 'login.html';
            return;
        }

        this.usuario = usuario || this.sesion.usuarioActivo || 'admin';

        this.inventario = new Inventario(this.usuario);
        this.estadisticasModel = new EstadModel(this.usuario);

        this.resumenTotales = document.getElementById('resumenTotales');
        this.tablaBody = document.querySelector('#tablaProductos tbody');
        this.tablaDiasBody = document.querySelector('#tablaDias tbody');

        this.chartTopProductos = null;
        this.chartCategorias = null;
        this.chartIngresos = null;
        this.chartPromedios = null;
        this.chartDia = null;
        this.chartVentasPorDia = null;
        this.chartGananciasPorDia = null;

        this.init();
    }

    init() {
        const volver = document.getElementById('volverBtn');
        if (volver) volver.addEventListener('click', () => location.href = 'index.html');

        const expBtn = document.getElementById('exportarCSVBtn');
        if (expBtn) expBtn.addEventListener('click', () => this.exportarCSV());

        const resetBtn = document.getElementById('resetEstadisticasBtn');
        if (resetBtn)
            resetBtn.addEventListener('click', () => {
                if (confirm("¿Seguro que quieres resetear TODAS las estadísticas?")) {
                    this.estadisticasModel.resetearEstadisticas();
                    alert("Estadísticas reiniciadas.");
                    this.renderizarTodo();
                }
            });

        document.addEventListener('ventasActualizadas', () => this.renderizarTodo());

        this.renderizarTodo();
    }

    obtenerDatosCompletos() {
        const productos = this.inventario.obtenerTodos()
            .map(p => Object.assign(new Producto(), p));

        const registros = this.estadisticasModel.obtenerRegistros();

        return { productos, registros };
    }

    _obtenerClavesRegistroDiario() {
        const pref = `registro_diario_${this.usuario}_`;
        return Object.keys(localStorage).filter(k => k.startsWith(pref));
    }

    _agruparRegistrosPorMes() {
        const claves = this._obtenerClavesRegistroDiario();
        const porMes = {};

        claves.forEach(k => {
            try {
                const valor = JSON.parse(localStorage.getItem(k));
                const parts = k.split('_');
                const fecha = parts[parts.length - 1];
                const mes = fecha.slice(0, 7);

                porMes[mes] = porMes[mes] || [];
                porMes[mes].push({ clave: k, fecha, datos: valor });
            } catch (e) { }
        });

        return porMes;
    }

    renderizarTodo() {

        const { productos } = this.obtenerDatosCompletos();

        const registroHoy = this.estadisticasModel.obtenerRegistroDiario();
        const totalesDia = this.estadisticasModel.calcularTotalesDelDia();

        const porMes = this._agruparRegistrosPorMes();
        const mesActual = (new Date()).toISOString().slice(0, 7);
        const registrosDelMes = porMes[mesActual] || [];

        const totalesMes = this._calcularTotalesParaRegistros(registrosDelMes);

        if (this.resumenTotales) {
            this.resumenTotales.innerHTML = `
                <p><strong>Costo total (hoy):</strong> $${(totalesDia.costoVendido || 0)}</p>
                <p><strong>Venta esperada (hoy):</strong> $${(totalesDia.ventaEsperadaDelDia || 0)}</p>
                <p><strong>Ingreso real (hoy):</strong> $${(totalesDia.ingresoReal || 0)}</p>
                <p><strong>Ganancia real (hoy):</strong> $${(totalesDia.gananciaReal || 0)}</p>
                <hr>
                <p><strong>Ingreso acumulado (mes):</strong> $${totalesMes.ingreso || 0}</p>
                <p><strong>Ganancia acumulada (mes):</strong> $${totalesMes.ganancia || 0}</p>
                <p><strong>Costo vendido (mes):</strong> $${totalesMes.costoVendido || 0}</p>
                <p><strong>Venta esperada (mes):</strong> $${totalesMes.ventaEsperada || 0}</p>
            `;
        }

        // 🔥 ACUMULADO CORREGIDO (YA NO DUPLICA)
        const acumuladoPorProducto = this._calcularAcumuladoPorProducto(productos, registroHoy);

        // TOP productos
        const topEntries = Object.entries(acumuladoPorProducto)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const topLabels = topEntries.map(e => e[0]);
        const topValues = topEntries.map(e => e[1]);

        this._dibujarGraficoBarras('chartTopProductos', topLabels, topValues, 'Unidades vendidas');

        const categoriasMap = this._calcularVentasPorCategoria(registroHoy);
        const catLabels = Object.keys(categoriasMap);
        const catValues = Object.values(categoriasMap);

        this._dibujarGraficoDona('chartCategorias', catLabels, catValues);

        this._dibujarGraficoDona(
            'chartIngresos',
            ['Ingreso real (hoy)', 'Venta esperada (hoy)'],
            [totalesDia.ingresoReal || 0, totalesDia.ventaEsperadaDelDia || 0]
        );

        const promedios = this.estadisticasModel.calcularPromedios();
        this._dibujarGraficoBarras('chartPromedios', Object.keys(promedios), Object.values(promedios), 'Promedios');

        if (registroHoy) {
            const labels = ['Mañana', 'Tarde'];
            const values = [
                registroHoy.turnos.mañana.ganancia || 0,
                registroHoy.turnos.tarde.ganancia || 0
            ];
            this._dibujarGraficoBarras('chartDia', labels, values, 'Ganancia por turno');
        }

        this._llenarTabla(productos, acumuladoPorProducto);

        this._llenarTablaDiasDelMes(registrosDelMes);
        this._dibujarVentasYGananciasPorDia(registrosDelMes);
    }

    // =============================================================
    //  🔥 CORREGIDO: YA NO SUMA INVENTARIO.VENDIDO (que duplicaba todo)
    // =============================================================

    _calcularAcumuladoPorProducto(productos, registroHoy) {
        const acumulado = {};

        // 1) Históricos
        const historicos = this.estadisticasModel.obtenerRegistros();
        historicos.forEach(reg => {
            (reg.datos || []).forEach(p => {
                acumulado[p.nombre] = (acumulado[p.nombre] || 0) + (p.vendido || 0);
            });
        });

        // 2) Hoy
        if (registroHoy && registroHoy.productos) {
            Object.values(registroHoy.productos).forEach(p => {
                acumulado[p.nombre] = (acumulado[p.nombre] || 0) + (p.vendidosHoy || 0);
            });
        }

        return acumulado;
    }

    _calcularVentasPorCategoria(registroHoy) {
        const map = {};

        // Históricos
        const historicos = this.estadisticasModel.obtenerRegistros();
        historicos.forEach(reg => {
            (reg.datos || []).forEach(p => {
                map[p.categoria] = (map[p.categoria] || 0) + (p.vendido || 0);
            });
        });

        // Hoy
        if (registroHoy && registroHoy.productos) {
            Object.values(registroHoy.productos).forEach(p => {
                map[p.categoria] = (map[p.categoria] || 0) + (p.vendidosHoy || 0);
            });
        }

        return map;
    }

    _calcularTotalesParaRegistros(registros) {
        const totales = { ingreso: 0, ganancia: 0, costoVendido: 0, ventaEsperada: 0 };

        registros.forEach(r => {
            const reg = r.datos;
            if (!reg) return;

            Object.values(reg.productos || {}).forEach(p => {
                const vendidos = Number(p.vendidosHoy || 0);
                const pv = Number(p.precioVenta || 0);
                const pc = Number(p.precioCosto || 0);

                totales.ingreso += vendidos * pv;
                totales.ganancia += Number(p.gananciaHoy || 0);
                totales.costoVendido += vendidos * pc;
            });
        });

        const inventarioActual = this.inventario.obtenerTodos();

        totales.ventaEsperada = inventarioActual.reduce(
            (acc, p) => acc + ((p.stock || 0) * (p.precioVenta || 0)),
            0
        );

        return totales;
    }

    _dibujarVentasYGananciasPorDia(registrosDelMes) {
        const dias = [];
        const ventas = [];
        const ganancias = [];

        registrosDelMes.sort((a, b) => a.fecha.localeCompare(b.fecha));

        registrosDelMes.forEach(r => {
            const reg = r.datos;
            let ingreso = 0;
            let ganancia = 0;

            Object.values(reg.productos || {}).forEach(p => {
                ingreso += Number(p.ingreso || 0);
                ganancia += Number(p.gananciaHoy || 0);
            });

            dias.push(r.fecha);
            ventas.push(ingreso);
            ganancias.push(ganancia);
        });

        this._dibujarGraficoBarras('chartVentasPorDia', dias, ventas, 'Ingreso por día');
        this._dibujarGraficoBarras('chartGananciasPorDia', dias, ganancias, 'Ganancias por día');
    }

    _llenarTablaDiasDelMes(registrosDelMes) {

        if (!this.tablaDiasBody) return;
        this.tablaDiasBody.innerHTML = '';

        registrosDelMes.sort((a, b) => a.fecha.localeCompare(b.fecha));

        registrosDelMes.forEach(r => {
            const reg = r.datos;

            let ingreso = 0;
            let ganancia = 0;
            let costoVendido = 0;

            Object.values(reg.productos || {}).forEach(p => {
                const vendidos = Number(p.vendidosHoy || 0);
                ingreso += (vendidos * Number(p.precioVenta || 0));
                ganancia += Number(p.gananciaHoy || 0);
                costoVendido += vendidos * Number(p.precioCosto || 0);
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.fecha}</td>
                <td>$${ingreso}</td>
                <td>$${ganancia}</td>
                <td>$${costoVendido}</td>
            `;
            this.tablaDiasBody.appendChild(tr);
        });
    }

    _llenarTabla(productos, acumulado) {
        if (!this.tablaBody) return;
        this.tablaBody.innerHTML = '';

        productos.forEach(p => {

            const vendidos = acumulado[p.nombre] || 0;
            const ganancia = vendidos * ((Number(p.precioVenta) || 0) - (Number(p.precioCosto) || 0));

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.nombre}</td>
                <td>${p.categoria || '(sin categoría)'}</td>
                <td>${p.stock}</td>
                <td>${vendidos}</td>
                <td>$${p.precioVenta}</td>
                <td>$${ganancia}</td>
            `;
            this.tablaBody.appendChild(tr);
        });
    }

    _dibujarGraficoBarras(id, labels, data, labelDataset = '') {

        const canvas = document.getElementById(id);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this[id]) {
            try { this[id].destroy(); } catch (e) { }
        }

        this[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: labelDataset,
                    data
                }]
            },
            options: { responsive: true }
        });
    }

    _dibujarGraficoDona(id, labels, data) {

        const canvas = document.getElementById(id);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this[id]) {
            try { this[id].destroy(); } catch (e) { }
        }

        this[id] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data }]
            },
            options: { responsive: true }
        });
    }

    exportarCSV() {
        const productos = this.inventario.obtenerTodos();
        let csv = 'Nombre,Categoría,Stock,Vendidos,PrecioVenta,GananciaTotal\n';

        productos.forEach(p => {
            csv += `${p.nombre},${p.categoria},${p.stock},${p.vendido},${p.precioVenta},${p.calcularGananciaTotal()}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'estadisticas_productos.csv';
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => new VistaEstadisticas());
