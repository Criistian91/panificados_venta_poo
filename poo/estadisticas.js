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

        // DOM
        this.resumenTotales = document.getElementById('resumenTotales');
        this.tablaBody = document.querySelector('#tablaProductos tbody');
        this.tablaDiasBody = document.querySelector('#tablaDias tbody');

        // chart refs (se guardan los objetos Chart.js)
        this.chartTopProductos = null;
        this.chartCategorias = null;
        this.chartIngresos = null;
        this.chartPromedios = null;
        this.chartDia = null;
        this.chartVentasPorDia = null;
        this.chartGananciasPorDia = null;

        // iniciar
        this.init();
    }

    init() {
        const volver = document.getElementById('volverBtn');
        if (volver) volver.addEventListener('click', () => location.href = 'index.html');

        const expBtn = document.getElementById('exportarCSVBtn');
        if (expBtn) expBtn.addEventListener('click', () => this.exportarCSV());

        const resetBtn = document.getElementById('resetEstadisticasBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (!confirm("¿Seguro que quieres resetear TODAS las estadísticas?")) return;

                // si el modelo tiene método resetearEstadisticas, usamos ese
                if (this.estadisticasModel && typeof this.estadisticasModel.resetearEstadisticas === 'function') {
                    this.estadisticasModel.resetearEstadisticas();
                } else {
                    // fallback: eliminar claves registro_diario_usuario_* y registro_usuario_*
                    const prefDiario = `registro_diario_${this.usuario}_`;
                    const prefHist = `registro_${this.usuario}_`;
                    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefDiario) || k.startsWith(prefHist));
                    keys.forEach(k => localStorage.removeItem(k));
                }

                alert("Estadísticas reiniciadas.");
                // refrescar vista
                this.renderizarTodo();
            });
        }

        // Re-render cada vez que se emita evento de ventas actualizadas
        document.addEventListener('ventasActualizadas', () => this.renderizarTodo());

        // Si no existe controller para charts, crear array global
        window.allCharts = window.allCharts || [];

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
                const fecha = parts[parts.length - 1]; // YYYY-MM-DD
                const mes = fecha.slice(0, 7); // YYYY-MM
                porMes[mes] = porMes[mes] || [];
                porMes[mes].push({ clave: k, fecha, datos: valor });
            } catch (e) {
                // ignore malformed
            }
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

        // acumulado por producto (históricos + hoy) - NO usar inventario.vendido para evitar duplicados
        const acumuladoPorProducto = this._calcularAcumuladoPorProducto(productos, registroHoy);

        // TOP productos
        const topEntries = Object.entries(acumuladoPorProducto)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const topLabels = topEntries.map(e => e[0]);
        const topValues = topEntries.map(e => e[1]);

        this._dibujarGraficoBarras('chartTopProductos', topLabels, topValues, 'Unidades vendidas');

        // ventas por categoria
        const categoriasMap = this._calcularVentasPorCategoria(registroHoy, productos);
        const catLabels = Object.keys(categoriasMap);
        const catValues = Object.values(categoriasMap);
        this._dibujarGraficoDona('chartCategorias', catLabels, catValues);

        // ingresos vs venta esperada (hoy)
        this._dibujarGraficoDona(
            'chartIngresos',
            ['Ingreso real (hoy)', 'Venta esperada (hoy)'],
            [totalesDia.ingresoReal || 0, totalesDia.ventaEsperadaDelDia || 0]
        );

        // promedios
        const promedios = this.estadisticasModel.calcularPromedios() || {};
        const promLabels = Object.keys(promedios);
        const promValues = promLabels.map(k => Number(promedios[k] || 0));
        this._dibujarGraficoBarras('chartPromedios', promLabels, promValues, 'Promedio unidades');

        // ganancia por turno (hoy)
        if (registroHoy) {
            const labels = ['Mañana', 'Tarde'];
            const values = [
                Number(registroHoy.turnos?.mañana?.ganancia || 0),
                Number(registroHoy.turnos?.tarde?.ganancia || 0)
            ];
            this._dibujarGraficoBarras('chartDia', labels, values, 'Ganancia por turno');
        }

        // tabla detalle por producto
        this._llenarTabla(productos, acumuladoPorProducto);

        // tabla días y gráficos por día
        this._llenarTablaDiasDelMes(registrosDelMes);
        this._dibujarVentasYGananciasPorDia(registrosDelMes);
    }

    // ----------------------------
    // calcular acumulados sin duplicar
    // ----------------------------
    _calcularAcumuladoPorProducto(productos, registroHoy) {
        const acumulado = {};

        // 1) históricos (registros cerrados)
        const historicos = this.estadisticasModel.obtenerRegistros() || [];
        historicos.forEach(reg => {
            (reg.datos || []).forEach(p => {
                const nombre = p.nombre || String(p.id || 'sin-nombre');
                acumulado[nombre] = (acumulado[nombre] || 0) + Number(p.vendido || 0);
            });
        });

        // 2) hoy (registro diario)
        if (registroHoy && registroHoy.productos) {
            Object.values(registroHoy.productos).forEach(p => {
                const nombre = p.nombre || String(p.id || 'sin-nombre');
                acumulado[nombre] = (acumulado[nombre] || 0) + Number(p.vendidosHoy || 0);
            });
        }

        return acumulado;
    }

    // ----------------------------
    // ventas por categoria (hist + hoy)
    // ----------------------------
    _calcularVentasPorCategoria(registroHoy, productos) {
        const map = {};

        const historicos = this.estadisticasModel.obtenerRegistros() || [];
        historicos.forEach(reg => {
            (reg.datos || []).forEach(p => {
                const cat = p.categoria || '(sin categoría)';
                map[cat] = (map[cat] || 0) + Number(p.vendido || 0);
            });
        });

        if (registroHoy && registroHoy.productos) {
            Object.values(registroHoy.productos).forEach(p => {
                const cat = p.categoria || '(sin categoría)';
                map[cat] = (map[cat] || 0) + Number(p.vendidosHoy || 0);
            });
        }

        return map;
    }

    // ----------------------------
    // totales para registros (mes)
    // ----------------------------
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

        // venta esperada aproximada con inventario actual
        const inventarioActual = this.inventario.obtenerTodos() || [];
        totales.ventaEsperada = inventarioActual.reduce((acc, p) => acc + ((p.stock || 0) * (p.precioVenta || 0)), 0);

        return totales;
    }

    // ----------------------------
    // ventas y ganancias por día -> gráficos
    // ----------------------------
    _dibujarVentasYGananciasPorDia(registrosDelMes) {
        const dias = [];
        const ventas = [];
        const ganancias = [];
        registrosDelMes.sort((a, b) => a.fecha.localeCompare(b.fecha));

        registrosDelMes.forEach(r => {
            const reg = r.datos || {};
            let ingreso = 0, ganancia = 0;
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

    // ----------------------------
    // tabla dias del mes
    // ----------------------------
    _llenarTablaDiasDelMes(registrosDelMes) {
        if (!this.tablaDiasBody) return;
        this.tablaDiasBody.innerHTML = '';
        registrosDelMes.sort((a, b) => a.fecha.localeCompare(b.fecha));

        registrosDelMes.forEach(r => {
            const reg = r.datos || {};
            let ingreso = 0, ganancia = 0, costoVendido = 0;
            Object.values(reg.productos || {}).forEach(p => {
                const vendidos = Number(p.vendidosHoy || 0);
                ingreso += vendidos * Number(p.precioVenta || 0);
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

    // ----------------------------
    // tabla detalle por producto
    // ----------------------------
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

    // ----------------------------
    // helpers para registrar / limpiar charts globalmente
    // ----------------------------
    _registerChartRef(id, chartObj) {
        // Si ya hay un chart con ese id en ventana, lo removemos y lo sustituimos
        window.allCharts = window.allCharts || [];

        // eliminar referencia previa con mismo id (si existe)
        window.allCharts = window.allCharts.filter(ch => {
            try {
                return ch && ch.canvas && ch.canvas.id !== id;
            } catch (e) {
                return true;
            }
        });

        // push nuevo
        if (chartObj) window.allCharts.push(chartObj);
    }

    // ----------------------------
    // DIBUJAR BARRAS (compatible dark/light)
    // ----------------------------
    _dibujarGraficoBarras(id, labels, data, labelDataset = '') {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // destruir si ya existe
        if (this[id]) {
            try { this[id].destroy(); } catch (e) { /* ignore */ }
            this[id] = null;
        }

        // colores adaptativos
        const C = (window.chartThemes && typeof window.chartThemes.getColors === 'function')
            ? window.chartThemes.getColors()
            : { text: '#222', grid: 'rgba(0,0,0,0.15)', border: '#444', barColors: ['#3366cc'] };

        // elegir colores de dataset (si hay varias barras, usar array cíclico)
        const bgColors = (Array.isArray(C.barColors) && C.barColors.length > 0)
            ? labels.map((_, i) => C.barColors[i % C.barColors.length])
            : labels.map(() => '#3366cc');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: labelDataset,
                    data,
                    backgroundColor: bgColors,
                    borderColor: C.border,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                animation: { duration: 600, easing: 'easeOutQuart' },
                scales: {
                    x: { ticks: { color: C.text }, grid: { color: C.grid } },
                    y: { ticks: { color: C.text }, grid: { color: C.grid } }
                },
                plugins: {
                    legend: { labels: { color: C.text } },
                    title: { display: false }
                }
            }
        });

        // registrar globalmente y aplicar tema
        this._registerChartRef(id, chart);
        if (window.chartThemes && typeof window.chartThemes.applyToChart === 'function') {
            window.chartThemes.applyToChart(chart);
        }

        this[id] = chart;
    }

    // ----------------------------
    // DIBUJAR DONA (compatible dark/light)
    // ----------------------------
    _dibujarGraficoDona(id, labels, data) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (this[id]) {
            try { this[id].destroy(); } catch (e) {}
            this[id] = null;
        }

        const C = (window.chartThemes && typeof window.chartThemes.getColors === 'function')
            ? window.chartThemes.getColors()
            : { text: '#222', grid: 'rgba(0,0,0,0.15)', border: '#444', donutColors: ['#3366cc', '#33aa33', '#ff9933'] };

        const bg = (Array.isArray(C.donutColors) && C.donutColors.length > 0) ? C.donutColors : ['#3366cc', '#33aa33', '#ff9933'];

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: bg.slice(0, labels.length),
                    borderColor: C.border,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                animation: { duration: 600, easing: 'easeOutQuart' },
                plugins: { legend: { labels: { color: C.text } }, title: { display: false } }
            }
        });

        this._registerChartRef(id, chart);
        if (window.chartThemes && typeof window.chartThemes.applyToChart === 'function') {
            window.chartThemes.applyToChart(chart);
        }

        this[id] = chart;
    }

    // ----------------------------
    // export CSV
    // ----------------------------
    exportarCSV() {
        const productos = this.inventario.obtenerTodos() || [];
        let csv = 'Nombre,Categoría,Stock,Vendidos,PrecioVenta,GananciaTotal\n';
        productos.forEach(p => {
            csv += `${p.nombre},${p.categoria || ''},${p.stock || 0},${p.vendido || 0},${p.precioVenta || 0},${p.calcularGananciaTotal ? p.calcularGananciaTotal() : 0}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'estadisticas_productos.csv';
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => new VistaEstadisticas());
