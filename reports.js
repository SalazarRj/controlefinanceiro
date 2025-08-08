// reports.js - VERSÃO DEFINITIVA E 100% COMPLETA

import { initFirebase } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS ---
const firebaseEnv = localStorage.getItem('firebaseEnv') || 'prd';
const { db, auth } = initFirebase(firebaseEnv);
let charts = {};
let allTransactions = [];
let userSettings = {};

// --- FUNÇÕES UTILITÁRIAS ---
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString) => new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');

// --- LÓGICA DE DADOS (Firestore) ---
const waitForAuth = () => new Promise((resolve, reject) => {
    onAuthStateChanged(auth, user => {
        if (user) resolve(user);
        else reject('Nenhum usuário autenticado.');
    }, () => reject('Erro no listener de autenticação.'));
});

const fetchAllData = async (userId) => {
    const settingsDocRef = doc(db, 'users', userId, 'data', 'settings');
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    try {
        const [settingsSnap, transactionsSnap] = await Promise.all([getDoc(settingsDocRef), getDocs(transactionsRef)]);
        userSettings = settingsSnap.exists() ? settingsSnap.data() : {};
        allTransactions = transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Erro ao buscar dados do Firestore: ", error);
    }
};

// --- LÓGICA DE FILTROS ---
const getFilteredTransactions = () => {
    const startDate = document.getElementById('filter-start-date')?.value;
    const endDate = document.getElementById('filter-end-date')?.value;
    const tipo = document.getElementById('filter-tipo')?.value;
    const categoria = document.getElementById('filter-categoria')?.value;
    return allTransactions.filter(t => {
        if (startDate && t.data < startDate) return false;
        if (endDate && t.data > endDate) return false;
        if (tipo && findTypeBy('id', t.tipoId)?.main !== tipo) return false;
        if (categoria && t.categoria !== categoria) return false;
        return true;
    });
};

const findTypeBy = (key, value) => userSettings.tipos?.find(t => t[key] == value);

// --- LÓGICA DA INTERFACE (UI) ---
const UIController = {
    async init() {
        try {
            const user = await waitForAuth();
            const userDisplay = document.getElementById('user-name-display-sidebar');
            if (userDisplay) userDisplay.textContent = user.email;
            
            await fetchAllData(user.uid);
            
            document.querySelector('main').innerHTML = this.getAppHTML();
            this.populateFilterOptions();
            this.setupEventListeners();
            this.switchTab('dashboard');
        } catch (error) {
            console.error(error);
            window.location.href = 'index.html';
        }
    },

    setupEventListeners() {
        const tabLinks = document.querySelectorAll('#sidebar-nav .tab-link');
        tabLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                tabLinks.forEach(btn => btn.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });
        
        const btnFiltrar = document.getElementById('btn-filtrar');
        if (btnFiltrar) {
            btnFiltrar.addEventListener('click', () => this.applyFiltersAndRender());
        }

        const btnLimpar = document.getElementById('btn-limpar-filtros');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => {
                const form = document.getElementById('filter-form');
                if (form) form.reset();
                this.applyFiltersAndRender();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = () => signOut(auth).catch(err => console.error(err));
        }

        const openMobileBtn = document.getElementById('open-sidebar-mobile-btn');
        if (openMobileBtn) {
            openMobileBtn.onclick = () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('-translate-x-full');
            };
        }
    },

    populateFilterOptions() {
        const tipos = [...new Set(allTransactions.map(t => findTypeBy('id', t.tipoId)?.main).filter(Boolean))];
        const categorias = [...new Set(allTransactions.map(t => t.categoria).filter(Boolean))].sort();
        const tipoSelect = document.getElementById('filter-tipo');
        if(tipoSelect) tipos.forEach(t => tipoSelect.innerHTML += `<option value="${t}">${t}</option>`);
        const categoriaSelect = document.getElementById('filter-categoria');
        if(categoriaSelect) categorias.forEach(c => categoriaSelect.innerHTML += `<option value="${c}">${c}</option>`);
    },
    
    applyFiltersAndRender() {
        const filteredTransactions = getFilteredTransactions();
        const activeTabElement = document.querySelector('.tab-link.active');
        if (activeTabElement) {
            const activeTabId = activeTabElement.dataset.tab;
            this.renderTabContent(activeTabId, filteredTransactions);
        } else {
            this.renderTabContent('dashboard', filteredTransactions);
        }
    },

    renderTabContent(tabName, transactions) {
        switch(tabName) {
            case 'dashboard': this.renderKPIs(transactions); break;
            case 'analises': ChartController.initAllCharts(transactions, userSettings.tipos || []); break;
            case 'extrato': this.renderExtratoDetalhado(transactions); break;
            case 'analise_categorias': this.renderAnaliseCategorias(transactions); break;
            case 'planejamento': this.renderComparativoOrcamento(transactions); break;
            case 'evolucao': this.renderEvolucaoPatrimonial(); break;
        }
    },
    
    renderKPIs(transactions) {
        const container = document.getElementById('kpi-container');
        if (!container) return;
        const income = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Receita').reduce((s, t) => s + t.valor, 0);
        const expense = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Despesa').reduce((s, t) => s + t.valor, 0);
        const investments = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Investimento').reduce((s, t) => s + t.valor, 0);
        const estornos = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Estorno').reduce((s, t) => s + t.valor, 0);
        const liquidExpense = expense - estornos;
        
        container.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Receitas</h3><p class="text-2xl font-bold text-green-500">${formatCurrency(income)}</p></div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Despesas Líquidas</h3><p class="text-2xl font-bold text-red-500">${formatCurrency(liquidExpense)}</p></div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Investimentos</h3><p class="text-2xl font-bold text-blue-500">${formatCurrency(investments)}</p></div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Final</h3><p class="text-2xl font-bold">${formatCurrency(income - liquidExpense - investments)}</p></div>
        `;
    },

    renderExtratoDetalhado(transactions) {
        const summaryContainer = document.getElementById('extrato-summary-container');
        const tableBody = document.getElementById('extrato-table-body');
        const monthlyContainer = document.getElementById('extrato-monthly-summary-container');
        if (!summaryContainer || !tableBody || !monthlyContainer) return;

        summaryContainer.innerHTML = '';
        tableBody.innerHTML = '';
        monthlyContainer.innerHTML = '';

        if (transactions.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-gray-500">Nenhum lançamento encontrado.</td></tr>`;
            return;
        }

        const totalIncome = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Receita').reduce((s, t) => s + t.valor, 0);
        const totalExpense = transactions.filter(t => ['Despesa', 'Investimento'].includes(findTypeBy('id', t.tipoId)?.main)).reduce((s, t) => s + t.valor, 0);
        summaryContainer.innerHTML = `
            <div class="bg-green-50 dark:bg-green-900/50 p-4 rounded-lg shadow"><h4 class="text-sm font-medium text-green-800 dark:text-green-300">Total de Receitas</h4><p class="text-2xl font-bold text-green-600 dark:text-green-400">${formatCurrency(totalIncome)}</p></div>
            <div class="bg-red-50 dark:bg-red-900/50 p-4 rounded-lg shadow"><h4 class="text-sm font-medium text-red-800 dark:text-red-300">Total de Despesas</h4><p class="text-2xl font-bold text-red-600 dark:text-red-400">${formatCurrency(totalExpense)}</p></div>
            <div class="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg shadow"><h4 class="text-sm font-medium text-blue-800 dark:text-blue-300">Saldo do Período</h4><p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${formatCurrency(totalIncome - totalExpense)}</p></div>
        `;

        transactions.sort((a, b) => new Date(b.data) - new Date(a.data));
        tableBody.innerHTML = transactions.map(t => {
            const tipo = findTypeBy('id', t.tipoId);
            const isExpense = ['Despesa', 'Investimento'].includes(tipo?.main);
            return `<tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"><td class="p-3">${formatDate(t.data)}</td><td class="p-3">${t.descricao}</td><td class="p-3">${tipo?.name || 'N/A'}</td><td class="p-3">${t.categoria}</td><td class="p-3 text-right font-medium ${isExpense ? 'text-red-500' : 'text-green-500'}">${isExpense ? '-' : '+'} ${formatCurrency(t.valor)}</td></tr>`;
        }).join('');

        const monthlySummary = {};
        transactions.forEach(t => {
            const monthYear = t.data.substring(0, 7);
            if (!monthlySummary[monthYear]) monthlySummary[monthYear] = { income: 0, expense: 0 };
            const tipo = findTypeBy('id', t.tipoId);
            if (tipo?.main === 'Receita') monthlySummary[monthYear].income += t.valor;
            if (['Despesa', 'Investimento'].includes(tipo?.main)) monthlySummary[monthYear].expense += t.valor;
        });
        const months = Object.keys(monthlySummary).sort();
        if (months.length > 1) {
            let monthlyHtml = `<h3 class="text-xl font-semibold mb-4">Resumo Mensal</h3><div class="table-container border rounded-lg"><table class="w-full text-sm"><thead class="bg-gray-50 dark:bg-gray-700 text-left"><th class="p-3">Mês/Ano</th><th class="p-3 text-right">Receitas</th><th class="p-3 text-right">Despesas</th><th class="p-3 text-right">Saldo</th></thead><tbody>`;
            months.forEach(month => {
                const data = monthlySummary[month];
                const balance = data.income - data.expense;
                const formattedMonth = new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                monthlyHtml += `<tr class="border-b border-gray-200 dark:border-gray-700"><td class="p-3 font-medium">${formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1)}</td><td class="p-3 text-right text-green-600">${formatCurrency(data.income)}</td><td class="p-3 text-right text-red-600">${formatCurrency(data.expense)}</td><td class="p-3 text-right font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}">${formatCurrency(balance)}</td></tr>`;
            });
            monthlyHtml += `</tbody></table></div>`;
            monthlyContainer.innerHTML = monthlyHtml;
        }
    },
    
    renderAnaliseCategorias(transactions) {
        const container = document.getElementById('analise-categorias-body');
        if (!container) return;
        const despesas = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Despesa');
        const totalDespesas = despesas.reduce((sum, t) => sum + t.valor, 0);
        if (totalDespesas === 0) {
            container.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-gray-500">Nenhuma despesa encontrada.</td></tr>`;
            return;
        }
        const gastoPorCategoria = despesas.reduce((acc, t) => {
            acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
            return acc;
        }, {});
        const sortedCategorias = Object.entries(gastoPorCategoria).sort((a, b) => b[1] - a[1]);
        container.innerHTML = sortedCategorias.map(([categoria, valor]) => `<tr class="border-b border-gray-200 dark:border-gray-700"><td class="p-3 font-medium">${categoria}</td><td class="p-3 text-right">${formatCurrency(valor)}</td><td class="p-3 text-right">${(valor / totalDespesas * 100).toFixed(1)}%</td></tr>`).join('');
    },

    renderComparativoOrcamento(transactions) {
        const container = document.getElementById('planejamento-body');
        if (!container) return;
        const orcamentos = userSettings.orcamentos || {};
        if (Object.keys(orcamentos).length === 0) {
            container.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">Nenhum orçamento definido.</td></tr>`;
            return;
        }
        let html = '';
        for (const categoria in orcamentos) {
            const orcado = orcamentos[categoria];
            const gasto = transactions.filter(t => t.categoria === categoria && findTypeBy('id', t.tipoId)?.main === 'Despesa').reduce((sum, t) => sum + t.valor, 0);
            const diferenca = orcado - gasto;
            const corDiferenca = diferenca >= 0 ? 'text-green-500' : 'text-red-500';
            html += `<tr class="border-b border-gray-200 dark:border-gray-700"><td class="p-3 font-medium">${categoria}</td><td class="p-3 text-right">${formatCurrency(orcado)}</td><td class="p-3 text-right">${formatCurrency(gasto)}</td><td class="p-3 text-right font-bold ${corDiferenca}">${formatCurrency(diferenca)}</td></tr>`;
        }
        container.innerHTML = html;
    },

    renderEvolucaoPatrimonial() {
        const ctx = document.getElementById('evolucaoChart')?.getContext('2d');
        if (!ctx) return;
        const saldosMensais = {};
        allTransactions.forEach(t => {
            const mesAno = t.data.substring(0, 7);
            if (!saldosMensais[mesAno]) saldosMensais[mesAno] = 0;
            const tipo = findTypeBy('id', t.tipoId);
            if (tipo?.main === 'Receita') saldosMensais[mesAno] += t.valor;
            if (['Despesa', 'Investimento'].includes(tipo?.main)) saldosMensais[mesAno] -= t.valor;
        });
        const sortedMonths = Object.keys(saldosMensais).sort();
        const last12Months = sortedMonths.slice(-12);
        let patrimonioAcumulado = 0;
        const data = { labels: [], datasets: [{ label: 'Patrimônio Acumulado', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.1, fill: true }] };
        last12Months.forEach(mesAno => {
            patrimonioAcumulado += saldosMensais[mesAno];
            data.labels.push(new Date(mesAno + '-02').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
            data.datasets[0].data.push(patrimonioAcumulado);
        });
        if (charts.evolucao) charts.evolucao.destroy();
        charts.evolucao = new Chart(ctx, { type: 'line', data });
    },
    
    switchTab(tabName) {
        document.querySelectorAll('.reports-tab-content').forEach(c => c.classList.remove('active'));
        const activeTabContent = document.getElementById(tabName);
        if (activeTabContent) activeTabContent.classList.add('active');
        const pageTitle = document.getElementById('page-title');
        const activeLink = document.querySelector(`.tab-link[data-tab="${tabName}"]`);
        if(pageTitle && activeLink) pageTitle.textContent = activeLink.textContent;
        this.applyFiltersAndRender();
    },

    getAppHTML() {
        return `
            <div class="container mx-auto p-4 md:p-8">
                <header class="flex justify-between items-center mb-4"><button id="open-sidebar-mobile-btn" class="md:hidden p-2 rounded-md"><i class="fa-solid fa-bars fa-lg"></i></button><div><h1 id="page-title" class="text-2xl md:text-3xl font-bold"></h1></div></header>
                <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                    <form id="filter-form" class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div><label class="text-sm font-medium">Data Início</label><input type="date" id="filter-start-date" class="mt-1 w-full p-2 border dark:border-gray-600 dark:bg-gray-700 rounded-md"></div>
                        <div><label class="text-sm font-medium">Data Fim</label><input type="date" id="filter-end-date" class="mt-1 w-full p-2 border dark:border-gray-600 dark:bg-gray-700 rounded-md"></div>
                        <div><label class="text-sm font-medium">Tipo</label><select id="filter-tipo" class="mt-1 w-full p-2 border dark:border-gray-600 dark:bg-gray-700 rounded-md"><option value="">Todos</option></select></div>
                        <div><label class="text-sm font-medium">Categoria</label><select id="filter-categoria" class="mt-1 w-full p-2 border dark:border-gray-600 dark:bg-gray-700 rounded-md"><option value="">Todas</option></select></div>
                        <div class="flex gap-2"><button type="button" id="btn-filtrar" class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700">Filtrar</button><button type="button" id="btn-limpar-filtros" class="w-full bg-gray-300 dark:bg-gray-600 font-bold py-2 px-4 rounded-md hover:bg-gray-400">Limpar</button></div>
                    </form>
                </div>
                <div id="tab-container">
                    <div id="dashboard" class="reports-tab-content space-y-6"><div id="kpi-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"></div></div>
                    <div id="analises" class="reports-tab-content space-y-6"><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h2 class="text-xl font-semibold mb-4">Distribuição de Despesas</h2><div class="h-80"><canvas id="expenseChart"></canvas></div></div><div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h2 class="text-xl font-semibold mb-4">Origem das Receitas</h2><div class="h-80"><canvas id="incomeChart"></canvas></div></div></div></div>
                    <div id="extrato" class="reports-tab-content space-y-6"><div id="extrato-summary-container" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div><div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md"><div class="table-container"><table class="w-full text-sm"><thead class="bg-gray-50 dark:bg-gray-700 text-left"><th class="p-3">Data</th><th class="p-3">Descrição</th><th class="p-3">Tipo</th><th class="p-3">Categoria</th><th class="p-3 text-right">Valor</th></thead><tbody id="extrato-table-body"></tbody></table></div></div><div id="extrato-monthly-summary-container" class="mt-6"></div></div>
                    <div id="analise_categorias" class="reports-tab-content bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md"><table class="w-full text-sm"><thead class="bg-gray-50 dark:bg-gray-700 text-left"><th class="p-3">Categoria</th><th class="p-3 text-right">Gasto Total</th><th class="p-3 text-right">% do Total</th></thead><tbody id="analise-categorias-body"></tbody></table></div>
                    <div id="planejamento" class="reports-tab-content bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md"><table class="w-full text-sm"><thead class="bg-gray-50 dark:bg-gray-700 text-left"><th class="p-3">Categoria</th><th class="p-3 text-right">Orçado</th><th class="p-3 text-right">Gasto</th><th class="p-3 text-right">Diferença</th></thead><tbody id="planejamento-body"></tbody></table></div>
                    <div id="evolucao" class="reports-tab-content bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md"><h2 class="text-xl font-semibold mb-4">Evolução Patrimonial (Últimos 12 meses)</h2><div class="h-96"><canvas id="evolucaoChart"></canvas></div></div>
                </div>
            </div>
        `;
    }
};

const ChartController = {
    initAllCharts(transactions, tipos) {
        if (charts.expense) charts.expense.destroy();
        if (charts.income) charts.income.destroy();
        this.createExpenseChart(transactions, tipos);
        this.createIncomeChart(transactions, tipos);
    },
    createExpenseChart(transactions, tipos) {
        const ctx = document.getElementById('expenseChart')?.getContext('2d');
        if (!ctx) return;
        const expenseByCategory = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Despesa').reduce((acc, t) => { acc[t.categoria] = (acc[t.categoria] || 0) + t.valor; return acc; }, {});
        charts.expense = new Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(expenseByCategory), datasets: [{ data: Object.values(expenseByCategory), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] }] }, options: { responsive: true, maintainAspectRatio: false }});
    },
    createIncomeChart(transactions, tipos) {
        const ctx = document.getElementById('incomeChart')?.getContext('2d');
        if (!ctx) return;
        const incomeByCategory = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Receita').reduce((acc, t) => { acc[t.categoria] = (acc[t.categoria] || 0) + t.valor; return acc; }, {});
        charts.income = new Chart(ctx, { type: 'pie', data: { labels: Object.keys(incomeByCategory), datasets: [{ data: Object.values(incomeByCategory), backgroundColor: ['#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56'] }] }, options: { responsive: true, maintainAspectRatio: false }});
    }
};

document.addEventListener('DOMContentLoaded', () => UIController.init());