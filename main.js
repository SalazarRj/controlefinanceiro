import { initFirebase } from './firebase-config.js';
        import {
            getAuth,
            onAuthStateChanged,
            createUserWithEmailAndPassword,
            signInWithEmailAndPassword,
            signOut,
            setPersistence,
            browserLocalPersistence
        } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
        import {
            getFirestore,
            collection,
            doc,
            getDoc,
            setDoc,
            addDoc,
            getDocs,
            deleteDoc,
            updateDoc,
            query,
            where
        } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

        let firebaseApp = null;
        let auth = null;
        let db = null;
        let transactions = [];
        let settings = {};
        let currentUser = null;
        let transactionToEditOrDelete = null;
        let currentDate = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let activeFilters = { status: 'todas', cardId: 'all' };
        let expenseSortState = { key: 'data', order: 'asc' };
        let expenseSearchTerm = '';
        let selectedTransactionIds = [];
        let unifiedView = true;
        let ocultoCardDespesasGerais = false;
        let invoiceSortState = {};
        let thirdPartySortState = {};
        let whatsappShareData = null;
        
        const mainApp = document.getElementById('main-app');
        const reportsApp = document.getElementById('reports-app');
        const openDashboardLink = document.getElementById('openDashboardLink');
        const reportsTabLinks = document.querySelectorAll('.reports-tab-link');
        const reportsTabContents = document.querySelectorAll('.reports-tab-content');

        let reportsInitialized = false; // Flag para carregar dados apenas uma vez
        let simulatedExpenses = []; 
        let simulationDate = new Date();

        // Variáveis para os gráficos
        let expenseChartInstance = null;
        let incomeExpenseChartInstance = null;

        const loadingContainer = document.getElementById('loading-container');
        const authContainer = document.getElementById('auth-container');
        const appWrapper = document.getElementById('app-wrapper');
        const mainAppContainer = document.getElementById('main-app');

        const loginFormContainer = document.getElementById('login-form-container');
        const registerFormContainer = document.getElementById('register-form-container');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showRegisterLink = document.getElementById('show-register-form-link');
        const showLoginLink = document.getElementById('show-login-form-link');
        const loginErrorEl = document.getElementById('login-error');
        const registerErrorEl = document.getElementById('register-error');

        const logoutBtn = document.getElementById('logoutBtn');
        const envRadios = document.querySelectorAll('input[name="firebase-env"]');
        const allModals = document.querySelectorAll('.modal');
        const modalBackdrop = document.getElementById('modalBackdrop');
        const openCadastroHubBtn = document.getElementById('openCadastroHubBtn');
        const openReportBtn = document.getElementById('openReportBtn');
        const addTransactionBtn = document.getElementById('addTransactionBtn');
        const prevMonthBtn = document.getElementById('prev-month-btn');
        const nextMonthBtn = document.getElementById('next-month-btn');
        const todayBtn = document.getElementById('today-btn');
        const currentMonthDisplay = document.getElementById('current-month-display');
        const expenseSortContainer = document.getElementById('expense-sort-container');
        const faturasViewContent = document.getElementById('faturas-view-content');
        const emptyStateFaturas = document.getElementById('empty-state-faturas');
        const tabLancamentos = document.getElementById('tab-lancamentos');
        const tabFaturas = document.getElementById('tab-faturas');
        const tabTerceiros = document.getElementById('tab-terceiros');
        const btnAgrupar = document.getElementById('toggle-grouping-btn');
        const tabContentLancamentos = document.getElementById('tab-content-lancamentos');
        const tabContentFaturas = document.getElementById('tab-content-faturas');
        const tabContentTerceiros = document.getElementById('tab-content-terceiros');
        const filterContainer = document.getElementById('filter-container');
        const bulkActionsContainer = document.getElementById('bulk-actions-container');
        const quitOpenBtn = document.getElementById('quit-open-btn');
        const reversePaidBtn = document.getElementById('reverse-paid-btn');
        const selectAllExpensesCheckbox = document.getElementById('select-all-expenses-checkbox');

        const defaultSettings = {
            tipos: [
                { id: 1, name: 'Salário', main: 'Receita' },
                { id: 2, name: 'Aluguel', main: 'Despesa' },
                { id: 3, name: 'Internet', main: 'Despesa' },
                { id: 4, name: 'Compras', main: 'Despesa' },
                { id: 5, name: 'Lazer', main: 'Despesa' },
                { id: 6, name: 'Investimento', main: 'Investimento' },
                { id: 7, name: 'Anuidade', main: 'Despesa' },
                { id: 8, name: 'Estorno', main: 'Estorno' },
                { id: 9, name: 'Pagamento Recebido', main: 'Recebimento' }
            ],
            categorias: {
                '1': ['Salário', 'Outras Receitas'],
                '2': ['Moradia'],
                '3': ['Contas', 'Assinaturas'],
                '4': ['Mercado'],
                '5': ['Lazer'],
                '7': ['Anuidade'],
                '6': ['Ações', 'Renda Fixa'],
                '8': ['Estorno Cartão'],
                '9': ['Pagamento de Dívida']
            },
            cartoes: [
                {id: 9001, name: "Azul", bandeira: "Visa", diaVencimento: 15, temAnuidade: false, valorAnuidade: 0, parcelasAnuidade: 0},
                {id: 9002, name: "Smile", bandeira: "Mastercard", diaVencimento: 9, temAnuidade: false, valorAnuidade: 0, parcelasAnuidade: 0}
            ],
            orcamentos: {}
        };

        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginFormContainer.classList.add('hidden');
            registerFormContainer.classList.remove('hidden');
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerFormContainer.classList.add('hidden');
            loginFormContainer.classList.remove('hidden');
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            loginErrorEl.textContent = '';
            signInWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    console.error("Erro de login:", error);
                    loginErrorEl.textContent = "Email ou senha inválidos.";
                });
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = registerForm.email.value;
            const password = registerForm.password.value;
            registerErrorEl.textContent = '';

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const settingsDocRef = doc(db, 'users', user.uid, 'data', 'settings');
                await setDoc(settingsDocRef, defaultSettings);
            } catch (error) {
                console.error("Erro de cadastro:", error);
                if (error.code === 'auth/weak-password') {
                    registerErrorEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
                } else if (error.code === 'auth/email-already-in-use') {
                    registerErrorEl.textContent = 'Este email já está em uso.';
                } else {
                    registerErrorEl.textContent = 'Ocorreu um erro ao criar a conta.';
                }
            }
        });


        logoutBtn.addEventListener('click', () => {
            if (auth) {
                signOut(auth).catch(error => console.error("Erro ao sair:", error));
            }
        });

        async function loadUserData() {
            if (!currentUser || !db) return;
        
            const settingsDocRef = doc(db, 'users', currentUser.uid, 'data', 'settings');
            const settingsDoc = await getDoc(settingsDocRef);
            if (settingsDoc.exists()) {
                settings = settingsDoc.data();
                if (!settings.tipos.some(t => t.name === 'Pagamento Recebido')) {
                    settings.tipos.push({ id: 9, name: 'Pagamento Recebido', main: 'Recebimento' });
                    settings.categorias['9'] = ['Pagamento de Dívida'];
                    await saveSettings();
                }
                if (!settings.orcamentos) {
                    settings.orcamentos = {};
                }
                // NOVO: Garante que o objeto de créditos de terceiros exista.
                if (!settings.thirdPartyCredits) {
                    settings.thirdPartyCredits = {};
                }
            } else {
                await setDoc(settingsDocRef, defaultSettings);
                settings = defaultSettings;
                // NOVO: Inicializa o objeto de créditos aqui também.
                settings.thirdPartyCredits = {};
            }
        
            if (!settings || !settings.cartoes || !settings.tipos || !settings.categorias) {
                console.error("Falha ao carregar ou inicializar as configurações do usuário.");
                throw new Error("Configurações do usuário corrompidas ou ausentes.");
            }
        
            const transactionsColRef = collection(db, 'users', currentUser.uid, 'transactions');
            const querySnapshot = await getDocs(transactionsColRef);
            transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        const saveSettings = async () => {
            if (!currentUser || !db) return;
            const settingsDocRef = doc(db, 'users', currentUser.uid, 'data', 'settings');
            await setDoc(settingsDocRef, settings);
        };

        const formatCurrency = (value) => {
            if (isNaN(value)) return "R$ 0,00";
            const options = { style: 'currency', currency: 'BRL' };
            if (value < 0) {
                return Math.abs(value).toLocaleString('pt-BR', options).replace('R$', 'R$ -');
            }
            return value.toLocaleString('pt-BR', options);
        };

        const formatCurrencyForShare = (value) => {
            if (isNaN(value)) return "R$ 0,00";
            const formatted = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `R$ ${formatted}`;
        };

        const parseCurrency = (valueStr) => parseFloat((valueStr || '0').replace(/\./g, '').replace(',', '.'));
        const findTypeBy = (key, value) => settings.tipos.find(t => t[key] == value);

        const getTransactionsForMonth = (date) => {
            return transactions.filter(t => {
                const tDate = new Date(t.data + 'T00:00:00');
                return tDate.getFullYear() === date.getFullYear() && tDate.getMonth() === date.getMonth();
            });
        };

        const calculateMonthBalance = (date) => {
            const monthTransactions = getTransactionsForMonth(date);
            const personalTransactions = monthTransactions.filter(t => !t.thirdParty || findTypeBy('id', t.tipoId)?.main === 'Recebimento');

            const getSum = (type) => personalTransactions.filter(t => findTypeBy('id', t.tipoId)?.main === type).reduce((acc, t) => acc + t.valor, 0);

            const receitas = getSum('Receita');
            const despesas = getSum('Despesa');
            const investimentos = getSum('Investimento');
            const estornos = getSum('Estorno');

            const despesasLiquidas = despesas - estornos;
            return receitas - despesasLiquidas - investimentos;
        };

        const calculateAccumulatedBalance = (untilDate) => {
            if (transactions.length === 0) return 0;

            const sortedTransactions = [...transactions].sort((a, b) => new Date(a.data) - new Date(b.data));
            const firstTransactionDate = new Date(sortedTransactions[0].data + 'T00:00:00');

            let accumulated = 0;
            let loopDate = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth(), 1);

            while (loopDate <= untilDate) {
                accumulated += calculateMonthBalance(loopDate);
                loopDate.setMonth(loopDate.getMonth() + 1);
            }

            return accumulated;
        };

        const updateBulkActionsUI = () => {
            const selectedTransactions = selectedTransactionIds.map(id => transactions.find(t => t.id === id)).filter(Boolean);
            const unpaidCount = selectedTransactions.filter(t => !t.pago).length;
            const paidCount = selectedTransactions.filter(t => t.pago && findTypeBy('id', t.tipoId)?.main !== 'Estorno').length;

            bulkActionsContainer.classList.toggle('hidden', selectedTransactionIds.length === 0);

            quitOpenBtn.classList.toggle('hidden', unpaidCount === 0);
            if (unpaidCount > 0) {
                quitOpenBtn.innerHTML = `<i class="fa fa-check-double"></i> Quitar ${unpaidCount} em Aberto`;
            }

            reversePaidBtn.classList.toggle('hidden', paidCount === 0);
            if (paidCount > 0) {
                reversePaidBtn.innerHTML = `<i class="fa-solid fa-receipt"></i> Estornar ${paidCount} Pagos`;
            }
        };

        const updateDRECard = () => {
            const prevMonthDate = new Date(currentDate);
            prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);

            const resultadoAcumuladoAnterior = calculateAccumulatedBalance(prevMonthDate);
            const resultadoMesAtual = calculateMonthBalance(currentDate);
            const novoResultadoAcumulado = resultadoAcumuladoAnterior + resultadoMesAtual;

            document.getElementById('dre-resultado').textContent = formatCurrency(novoResultadoAcumulado);
            document.getElementById('dre-saldo-anterior').textContent = formatCurrency(resultadoAcumuladoAnterior);
            document.getElementById('dre-saldo-atual').textContent = formatCurrency(resultadoMesAtual);

            styleCard(document.getElementById('dre-card'), novoResultadoAcumulado);
        };

        const styleCard = (cardElement, value) => {
            const title = cardElement.querySelector('p.text-sm');
            const amount = cardElement.querySelector('p.text-2xl');
            const details = cardElement.querySelector('#dre-details');

            cardElement.classList.remove('bg-white', 'bg-blue-500', 'bg-red-500', 'text-white');
            title.classList.remove('text-gray-500', 'text-white');
            amount.classList.remove('text-gray-800', 'text-white');
            if(details) details.classList.remove('text-gray-500', 'text-gray-300', 'text-red-300');

            if (value > 0) {
                cardElement.classList.add('bg-blue-500', 'text-white');
                title.classList.add('text-white');
                amount.classList.add('text-white');
                if(details) details.classList.add('text-gray-300');
            } else if (value < 0) {
                cardElement.classList.add('bg-red-500', 'text-white');
                title.classList.add('text-white');
                amount.classList.add('text-white');
                if(details) details.classList.add('text-red-300');
            } else {
                cardElement.classList.add('bg-white');
                title.classList.add('text-gray-500');
                amount.classList.add('text-gray-800');
                if(details) details.classList.add('text-gray-500');
            }
        };

        const updateUIForMonth = () => {
            if (!currentUser) return;
            currentMonthDisplay.textContent = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

            const monthTransactions = getTransactionsForMonth(currentDate);
            const personalTransactions = monthTransactions.filter(t => !t.thirdParty || findTypeBy('id', t.tipoId)?.main === 'Recebimento');

            const getSum = (type) => personalTransactions.filter(t => findTypeBy('id', t.tipoId)?.main === type).reduce((acc, t) => acc + t.valor, 0);

            const receitas = getSum('Receita');
            const despesas = getSum('Despesa');
            const investimentos = getSum('Investimento');
            const estornos = getSum('Estorno');
            const despesasLiquidas = despesas - estornos;
            const saldo = receitas - despesasLiquidas - investimentos;

            document.getElementById('summary-receitas').textContent = formatCurrency(receitas);
            document.getElementById('summary-despesas').textContent = formatCurrency(despesasLiquidas);
            document.getElementById('summary-investimentos').textContent = formatCurrency(investimentos);
            document.getElementById('summary-saldo').textContent = formatCurrency(saldo);

            const saldoCard = document.getElementById('saldo-card');
            saldoCard.classList.remove('bg-red-600', 'bg-gray-800');
            if (saldo < 0) {
                saldoCard.classList.add('bg-red-600');
            } else {
                saldoCard.classList.add('bg-gray-800');
            }

            selectedTransactionIds = [];
            updateBulkActionsUI();
            selectAllExpensesCheckbox.checked = false;

            renderTransactions(personalTransactions.filter(t => findTypeBy('id', t.tipoId)?.main !== 'Recebimento'));
            renderInvoicesView(personalTransactions);
            renderThirdPartyView();
            renderOrcamentosSummary(personalTransactions);
            checkForOverdueBills(personalTransactions);
            updateDRECard();
            // renderDashboardCharts(personalTransactions);
        };

        // const renderTransactions = (monthTransactions) => {
        //     const incomeTableBody = document.getElementById('income-table-body');
        //     const incomeTableFooterContainer = document.getElementById('income-table-footer-container');
        //     const expenseTableBody = document.getElementById('expense-table-body');
        //     const expenseTableFooterContainer = document.getElementById('expense-table-footer-container');
        //     const emptyStateIncome = document.getElementById('empty-state-income');
        //     const emptyStateExpenses = document.getElementById('empty-state-expenses');

        //     const incomeTransactions = monthTransactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Receita');
        //     let expenseTransactions = monthTransactions.filter(t => ['Despesa', 'Investimento'].includes(findTypeBy('id', t.tipoId)?.main));

        //     incomeTableBody.innerHTML = '';
        //     emptyStateIncome.style.display = incomeTransactions.length > 0 ? 'none' : 'block';
        //     incomeTransactions.sort((a,b) => new Date(a.data) - new Date(b.data)).forEach(t => {
        //         const row = document.createElement('tr'); row.className = 'border-b';
        //         let description = t.descricao;
        //         if (t.recurring) { description += ` <span class="text-xs font-mono text-purple-500">(Fixa)</span>`; }
        //         row.innerHTML = `
        //             <td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center bg-green-100"><i class="fa-solid fa-arrow-up text-green-600"></i></div><div class="font-semibold text-gray-800">${description}</div></div></td>
        //             <td class="px-6 py-4 whitespace-nowrap">${new Date(t.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
        //             <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">${t.categoria}</span></td>
        //             <td class="px-6 py-4 text-right font-mono font-semibold text-green-600 whitespace-nowrap">+ ${formatCurrency(t.valor)}</td>
        //             <td class="px-6 py-4 text-center"><div class="flex justify-center items-center gap-3"><button class="edit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}"><i class="fa-solid fa-pen-to-square"></i></button><button class="delete-btn text-gray-400 hover:text-red-500" data-id="${t.id}"><i class="fa fa-trash-alt"></i></button></div></td>`;
        //         incomeTableBody.appendChild(row);
        //     });
        //     const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.valor, 0);
        //     if (totalIncome > 0) {
        //         incomeTableFooterContainer.innerHTML = `<div class="flex justify-end items-center px-6 py-3 border-t"><span class="text-right font-bold text-gray-800 mr-4">Total Receitas:</span><span class="font-bold text-green-600 w-32 text-right">${formatCurrency(totalIncome)}</span><div class="w-20"></div></div>`;
        //     } else {
        //         incomeTableFooterContainer.innerHTML = '';
        //     }

        //     const incomeTableContainer = document.getElementById('income-table-container');
        //     if (incomeTransactions.length > 10) {
        //         incomeTableContainer.classList.add('table-scrollable');
        //     } else {
        //         incomeTableContainer.classList.remove('table-scrollable');
        //     }

        //     if (activeFilters.status === 'nao-pagas') {
        //         expenseTransactions = expenseTransactions.filter(t => !t.pago);
        //     } else if (activeFilters.status === 'pagas') {
        //         expenseTransactions = expenseTransactions.filter(t => t.pago);
        //     } else if (activeFilters.status === 'vencidas') {
        //         expenseTransactions = expenseTransactions.filter(t => {
        //             const dueDate = new Date(t.data + 'T00:00:00');
        //             return !t.pago && dueDate < today;
        //         });
        //     }

        //     if(activeFilters.cardId !== 'all') {
        //         if(activeFilters.cardId === 'geral') {
        //             expenseTransactions = expenseTransactions.filter(t => !t.cartaoId);
        //         } else {
        //             expenseTransactions = expenseTransactions.filter(t => t.cartaoId == activeFilters.cardId);
        //         }
        //     }


        //     expenseTransactions.sort((a, b) => {
        //         const order = expenseSortState.order === 'asc' ? 1 : -1;
        //         switch (expenseSortState.key) {
        //             case 'descricao': return a.descricao.localeCompare(b.descricao) * order;
        //             case 'valor': return (a.valor - b.valor) * order;
        //             default: return (new Date(a.data) - new Date(b.data)) * order;
        //         }
        //     });

        //     expenseTableBody.innerHTML = '';
        //     emptyStateExpenses.style.display = expenseTransactions.length > 0 ? 'none' : 'block';

        //     expenseTransactions.forEach(t => {
        //         const tipoObj = findTypeBy('id', t.tipoId);
        //         const mainType = tipoObj?.main || 'Despesa';
        //         let colorClass = 'text-red-600', icon = 'fa-solid fa-arrow-down';
        //         if(mainType === 'Estorno') { colorClass = 'text-green-600'; icon = 'fa-solid fa-receipt'; }
        //         else if (mainType === 'Investimento') { colorClass = 'text-blue-600'; icon = 'fa-solid fa-piggy-bank'; }

        //         let description = t.descricao;
        //         if (t.installments) { description += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total} de ${formatCurrency(t.installments.totalValue)})</span>`; }
        //         else if (t.recurring) { description += ` <span class="text-xs font-mono text-purple-500">(Fixa)</span>`; }

        //         const cartao = settings.cartoes.find(c => c.id == t.cartaoId);
        //         let lastInstallmentDate = '---';
        //         if (t.installments) {
        //             const firstDate = new Date(t.data + 'T00:00:00');
        //             firstDate.setMonth(firstDate.getMonth() - (t.installments.current - 1));
        //             const lastDate = new Date(firstDate);
        //             lastDate.setMonth(firstDate.getMonth() + t.installments.total - 1);
        //             lastInstallmentDate = lastDate.toLocaleDateString('pt-BR');
        //         }

        //         const isOverdue = !t.pago && new Date(t.data + 'T00:00:00') < today;
        //         const dateDisplay = `${new Date(t.data+'T00:00:00').toLocaleDateString('pt-BR')} ${isOverdue ? '<i class="fa-solid fa-triangle-exclamation text-red-500 ml-1" title="Vencido"></i>' : ''}`;

        //         const row = document.createElement('tr');
        //         row.className = `border-b hover:bg-gray-50 ${t.pago ? 'transaction-paid' : ''}`;
        //         row.innerHTML = `
        //             <td class="px-6 py-4"><input type="checkbox" class="select-transaction-checkbox" data-id="${t.id}" ${selectedTransactionIds.includes(t.id) ? 'checked' : ''}></td>
        //             <td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center ${mainType === 'Despesa' ? 'bg-red-100' : (mainType === 'Investimento' ? 'bg-blue-100' : 'bg-green-100')}"><i class="${icon} ${colorClass}"></i></div><div class="font-semibold text-gray-800 description">${description}</div></div></td>
        //             <td class="px-6 py-4 whitespace-nowrap">${dateDisplay}</td>
        //             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastInstallmentDate}</td>
        //             <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">${t.categoria}</span></td>
        //             <td class="px-6 py-4 text-gray-600 whitespace-nowrap"><i class="fa-regular fa-credit-card mr-2"></i>${cartao ? cartao.name : '---'}</td>
        //             <td class="px-6 py-4 text-right font-mono font-semibold ${colorClass} whitespace-nowrap">${mainType === 'Estorno' ? '+' : '-'} ${formatCurrency(t.valor)}</td>
        //             <td class="px-6 py-4 text-center"><div class="flex justify-center items-center gap-3"><button class="quit-btn text-gray-400 hover:text-green-500" data-id="${t.id}">${t.pago ? '<i class="fa-solid fa-check-circle text-green-500"></i>' : '<i class="fa-solid fa-check"></i>'}</button><button class="edit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}"><i class="fa-solid fa-pen-to-square"></i></button><button class="delete-btn text-gray-400 hover:text-red-500" data-id="${t.id}"><i class="fa fa-trash-alt"></i></button></div></td>`;
        //         expenseTableBody.appendChild(row);
        //     });

        //     const expenseTableContainer = document.getElementById('expense-table-container');
        //     if (expenseTransactions.length > 10) {
        //         expenseTableContainer.classList.add('table-scrollable');
        //     } else {
        //         expenseTableContainer.classList.remove('table-scrollable');
        //     }

        //     expenseTableFooterContainer.innerHTML = '';
        //     if (activeFilters.status === 'pagas') {
        //         const totalPaid = expenseTransactions.reduce((sum, t) => {
        //             const tipoObj = findTypeBy('id', t.tipoId);
        //             return sum + (tipoObj?.main === 'Estorno' ? -t.valor : t.valor);
        //         }, 0);
        //         if (totalPaid > 0) {
        //             expenseTableFooterContainer.innerHTML = `<div class="flex justify-end items-center px-6 py-3 border-t"><span class="text-right font-bold text-gray-800 mr-4">Total Pago:</span><span class="font-bold text-green-600 w-32 text-right">${formatCurrency(totalPaid)}</span><div class="w-20"></div></div>`;
        //         }
        //     } else {
        //          const totalUnpaid = monthTransactions.filter(t => !t.pago && ['Despesa', 'Investimento', 'Estorno'].includes(findTypeBy('id', t.tipoId)?.main)).reduce((sum, t) => {
        //             const tipoObj = findTypeBy('id', t.tipoId);
        //             return sum + (tipoObj?.main === 'Estorno' ? -t.valor : t.valor);
        //         }, 0);
        //         if (totalUnpaid > 0) {
        //             expenseTableFooterContainer.innerHTML = `<div class="flex justify-end items-center px-6 py-3 border-t"><span class="text-right font-bold text-gray-800 mr-4">Total a Pagar:</span><span class="font-bold text-red-600 w-32 text-right">${formatCurrency(totalUnpaid)}</span><div class="w-20"></div></div>`;
        //         }
        //     }
        // };

        // const renderTransactions = (monthTransactions) => {
        //     const incomeTableBody = document.getElementById('income-table-body');
        //     const incomeTableFooterContainer = document.getElementById('income-table-footer-container');
        //     const expenseTableBody = document.getElementById('expense-table-body');
        //     const expenseTableFooterContainer = document.getElementById('expense-table-footer-container');
        //     const emptyStateIncome = document.getElementById('empty-state-income');
        //     const emptyStateExpenses = document.getElementById('empty-state-expenses');
        
        //     // --- Seção de Receitas (sem alteração de lógica) ---
        //     const incomeTransactions = monthTransactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Receita');
        //     incomeTableBody.innerHTML = '';
        //     emptyStateIncome.style.display = incomeTransactions.length > 0 ? 'none' : 'block';
        //     incomeTransactions.sort((a,b) => new Date(a.data) - new Date(b.data)).forEach(t => {
        //         const row = document.createElement('tr'); row.className = 'border-b';
        //         let description = t.descricao;
        //         if (t.recurring) { description += ` <span class="text-xs font-mono text-purple-500">(Fixa)</span>`; }
        //         row.innerHTML = `
        //             <td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center bg-green-100"><i class="fa-solid fa-arrow-up text-green-600"></i></div><div class="font-semibold text-gray-800">${description}</div></div></td>
        //             <td class="px-6 py-4 whitespace-nowrap">${new Date(t.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
        //             <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">${t.categoria}</span></td>
        //             <td class="px-6 py-4 text-right font-mono font-semibold text-green-600 whitespace-nowrap">+ ${formatCurrency(t.valor)}</td>
        //             <td class="px-6 py-4 text-center"><div class="flex justify-center items-center gap-3"><button class="edit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}"><i class="fa-solid fa-pen-to-square"></i></button><button class="delete-btn text-gray-400 hover:text-red-500" data-id="${t.id}"><i class="fa fa-trash-alt"></i></button></div></td>`;
        //         incomeTableBody.appendChild(row);
        //     });
        //     const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.valor, 0);
        //     incomeTableFooterContainer.innerHTML = (totalIncome > 0) ? `<div class="flex justify-end items-center px-6 py-3 border-t"><span class="text-right font-bold text-gray-800 mr-4">Total Receitas:</span><span class="font-bold text-green-600 w-32 text-right">${formatCurrency(totalIncome)}</span><div class="w-20"></div></div>` : '';
        
        
        //     // --- Seção de Despesas (com todas as melhorias) ---
        //     let expenseTransactions = monthTransactions.filter(t => ['Despesa', 'Investimento', 'Estorno'].includes(findTypeBy('id', t.tipoId)?.main));
        
        //     // 1. Aplica filtros de STATUS e CARTÃO
        //     if (activeFilters.status === 'nao-pagas') {
        //         expenseTransactions = expenseTransactions.filter(t => !t.pago);
        //     } else if (activeFilters.status === 'pagas') {
        //         expenseTransactions = expenseTransactions.filter(t => t.pago);
        //     } else if (activeFilters.status === 'vencidas') {
        //         expenseTransactions = expenseTransactions.filter(t => !t.pago && new Date(t.data + 'T00:00:00') < today);
        //     }
        //     if(activeFilters.cardId !== 'all') {
        //         expenseTransactions = expenseTransactions.filter(t => String(t.cartaoId || 'geral') === String(activeFilters.cardId));
        //     }
        
        //     // 2. NOVO: Aplica o filtro de PESQUISA
        //     if (expenseSearchTerm) {
        //         expenseTransactions = expenseTransactions.filter(t =>
        //             t.descricao.toLowerCase().includes(expenseSearchTerm) ||
        //             String(t.valor).replace('.', ',').includes(expenseSearchTerm)
        //         );
        //     }
        
        //     // 3. Ordena a lista já filtrada
        //     expenseTransactions.sort((a, b) => {
        //         const order = expenseSortState.order === 'asc' ? 1 : -1;
        //         switch (expenseSortState.key) {
        //             case 'descricao': return a.descricao.localeCompare(b.descricao) * order;
        //             case 'valor': return (a.valor - b.valor) * order;
        //             default: return (new Date(a.data) - new Date(b.data)) * order;
        //         }
        //     });
        
        //     expenseTableBody.innerHTML = '';
        //     emptyStateExpenses.style.display = expenseTransactions.length > 0 ? 'none' : 'block';
        
        //     // 4. ALTERADO: Renderiza as linhas da tabela, incluindo o novo ID sequencial
        //     expenseTransactions.forEach((t, index) => { // 'index' adicionado
        //         const tipoObj = findTypeBy('id', t.tipoId);
        //         const mainType = tipoObj?.main || 'Despesa';
        //         let colorClass = 'text-red-600', icon = 'fa-solid fa-arrow-down';
        //         if(mainType === 'Estorno') { colorClass = 'text-green-600'; icon = 'fa-solid fa-receipt'; }
        //         else if (mainType === 'Investimento') { colorClass = 'text-blue-600'; icon = 'fa-solid fa-piggy-bank'; }
        
        //         let description = t.descricao;
        //         if (t.installments) { description += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total} de ${formatCurrency(t.installments.totalValue)})</span>`; }
        //         else if (t.recurring) { description += ` <span class="text-xs font-mono text-purple-500">(Fixa)</span>`; }
        
        //         const cartao = settings.cartoes.find(c => c.id == t.cartaoId);
                
        //         let lastInstallmentDate = '---';
        //         if (t.installments) {
        //             const firstDate = new Date(t.data + 'T00:00:00');
        //             firstDate.setMonth(firstDate.getMonth() - (t.installments.current - 1));
        //             const lastDate = new Date(firstDate);
        //             lastDate.setMonth(firstDate.getMonth() + t.installments.total - 1);
        //             lastInstallmentDate = lastDate.toLocaleDateString('pt-BR');
        //         }
        
        //         const isOverdue = !t.pago && new Date(t.data + 'T00:00:00') < today;
        //         const dateDisplay = `${new Date(t.data+'T00:00:00').toLocaleDateString('pt-BR')} ${isOverdue ? '<i class="fa-solid fa-triangle-exclamation text-red-500 ml-1" title="Vencido"></i>' : ''}`;
        
        //         const row = document.createElement('tr');
        //         row.className = `border-b hover:bg-gray-50 ${t.pago ? 'transaction-paid' : ''}`;
        //         row.innerHTML = `
        //             <td class="px-6 py-4"><input type="checkbox" class="select-transaction-checkbox" data-id="${t.id}" ${selectedTransactionIds.includes(t.id) ? 'checked' : ''}></td>
        //             <td class="px-2 py-4 text-center text-gray-500 font-mono">${index + 1}</td>
        //             <td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center ${mainType === 'Despesa' ? 'bg-red-100' : (mainType === 'Investimento' ? 'bg-blue-100' : 'bg-green-100')}"><i class="${icon} ${colorClass}"></i></div><div class="font-semibold text-gray-800 description">${description}</div></div></td>
        //             <td class="px-6 py-4 whitespace-nowrap">${dateDisplay}</td>
        //             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastInstallmentDate}</td>
        //             <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">${t.categoria}</span></td>
        //             <td class="px-6 py-4 text-gray-600 whitespace-nowrap"><i class="fa-regular fa-credit-card mr-2"></i>${cartao ? cartao.name : '---'}</td>
        //             <td class="px-6 py-4 text-right font-mono font-semibold ${colorClass} whitespace-nowrap">${mainType === 'Estorno' ? '+' : '-'} ${formatCurrency(t.valor)}</td>
        //             <td class="px-6 py-4 text-center"><div class="flex justify-center items-center gap-3"><button class="quit-btn text-gray-400 hover:text-green-500" data-id="${t.id}">${t.pago ? '<i class="fa-solid fa-check-circle text-green-500"></i>' : '<i class="fa-solid fa-check"></i>'}</button><button class="edit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}"><i class="fa-solid fa-pen-to-square"></i></button><button class="delete-btn text-gray-400 hover:text-red-500" data-id="${t.id}"><i class="fa fa-trash-alt"></i></button></div></td>`;
        //         expenseTableBody.appendChild(row);
        //     });
            
        //     // 5. ALTERADO: Lógica do rodapé para usar a lista filtrada 'expenseTransactions'
        //     const totalExibido = expenseTransactions.reduce((sum, t) => {
        //         const tipoObj = findTypeBy('id', t.tipoId);
        //         return sum + (tipoObj?.main === 'Estorno' ? -t.valor : t.valor);
        //     }, 0);
        
        //     expenseTableFooterContainer.innerHTML = '';
        //     let labelTotal = 'Total Exibido:';
        //     let corTotal = 'text-gray-800';
        
        //     if (!expenseSearchTerm && activeFilters.cardId === 'all') {
        //         if (activeFilters.status === 'pagas') {
        //             labelTotal = 'Total Pago:';
        //             corTotal = 'text-green-600';
        //         } else if (activeFilters.status !== 'pagas') { // 'todas', 'nao-pagas', 'vencidas'
        //             labelTotal = 'Total a Pagar:';
        //             corTotal = 'text-red-600';
        //         }
        //     }
            
        //     if (totalExibido > 0 || expenseTransactions.length > 0) {
        //         expenseTableFooterContainer.innerHTML = `<div class="flex justify-end items-center px-6 py-3 border-t"><span class="text-right font-bold text-gray-800 mr-4">${labelTotal}</span><span class="font-bold ${corTotal} w-32 text-right">${formatCurrency(totalExibido)}</span><div class="w-20"></div></div>`;
        //     }
        // };

        // main.js -> Substitua esta função inteira

        const renderTransactions = (monthTransactions) => {
            const incomeTableBody = document.getElementById('income-table-body');
            const incomeTableFooterContainer = document.getElementById('income-table-footer-container');
            const expenseTableBody = document.getElementById('expense-table-body');
            const expenseTableFooterContainer = document.getElementById('expense-table-footer-container');
            const emptyStateIncome = document.getElementById('empty-state-income');
            const emptyStateExpenses = document.getElementById('empty-state-expenses');

            // --- Seção de Receitas (sem alteração de lógica) ---
            const incomeTransactions = monthTransactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Receita');
            incomeTableBody.innerHTML = '';
            emptyStateIncome.style.display = incomeTransactions.length > 0 ? 'none' : 'block';
            incomeTransactions.sort((a,b) => new Date(a.data) - new Date(b.data)).forEach(t => {
                const row = document.createElement('tr'); row.className = 'border-b';
                let description = t.descricao;
                if (t.recurring) { description += ` <span class="text-xs font-mono text-purple-500">(Fixa)</span>`; }
                row.innerHTML = `
                    <td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center bg-green-100"><i class="fa-solid fa-arrow-up text-green-600"></i></div><div class="font-semibold text-gray-800">${description}</div></div></td>
                    <td class="px-6 py-4 whitespace-nowrap">${new Date(t.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">${t.categoria}</span></td>
                    <td class="px-6 py-4 text-right font-mono font-semibold text-green-600 whitespace-nowrap">+ ${formatCurrency(t.valor)}</td>
                    <td class="px-6 py-4 text-center"><div class="flex justify-center items-center gap-3"><button class="edit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}"><i class="fa-solid fa-pen-to-square"></i></button><button class="delete-btn text-gray-400 hover:text-red-500" data-id="${t.id}"><i class="fa fa-trash-alt"></i></button></div></td>`;
                incomeTableBody.appendChild(row);
            });
            const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.valor, 0);
            incomeTableFooterContainer.innerHTML = (totalIncome > 0) ? `<div class="flex justify-end items-center px-6 py-3 border-t"><span class="text-right font-bold text-gray-800 mr-4">Total Receitas:</span><span class="font-bold text-green-600 w-32 text-right">${formatCurrency(totalIncome)}</span><div class="w-20"></div></div>` : '';


            // --- Seção de Despesas (com todas as melhorias) ---
            let expenseTransactions = monthTransactions.filter(t => ['Despesa', 'Investimento', 'Estorno'].includes(findTypeBy('id', t.tipoId)?.main));

            // --- INÍCIO DO AJUSTE DE ID SEQUENCIAL ---
            // 1. Cria uma lista mestre ordenada por data para definir a ordem original de lançamento.
            const allMonthExpensesOriginalOrder = [...expenseTransactions].sort((a, b) => new Date(a.data) - new Date(b.data));
            
            // 2. Mapeia cada ID de transação para seu número sequencial original.
            const sequentialIdMap = new Map();
            allMonthExpensesOriginalOrder.forEach((t, index) => {
                sequentialIdMap.set(t.id, index + 1);
            });
            // --- FIM DO AJUSTE ---

            // Aplica filtros de STATUS e CARTÃO
            if (activeFilters.status === 'nao-pagas') {
                expenseTransactions = expenseTransactions.filter(t => !t.pago);
            } else if (activeFilters.status === 'pagas') {
                expenseTransactions = expenseTransactions.filter(t => t.pago);
            } else if (activeFilters.status === 'vencidas') {
                expenseTransactions = expenseTransactions.filter(t => !t.pago && new Date(t.data + 'T00:00:00') < today);
            }
            if(activeFilters.cardId !== 'all') {
                expenseTransactions = expenseTransactions.filter(t => String(t.cartaoId || 'geral') === String(activeFilters.cardId));
            }

            // Aplica o filtro de PESQUISA
            if (expenseSearchTerm) {
                expenseTransactions = expenseTransactions.filter(t =>
                    t.descricao.toLowerCase().includes(expenseSearchTerm) ||
                    String(t.valor).replace('.', ',').includes(expenseSearchTerm)
                );
            }

            // Ordena a lista já filtrada
            expenseTransactions.sort((a, b) => {
                const order = expenseSortState.order === 'asc' ? 1 : -1;
                switch (expenseSortState.key) {
                    case 'descricao': return a.descricao.localeCompare(b.descricao) * order;
                    case 'valor': return (a.valor - b.valor) * order;
                    default: return (new Date(a.data) - new Date(b.data)) * order;
                }
            });

            expenseTableBody.innerHTML = '';
            emptyStateExpenses.style.display = expenseTransactions.length > 0 ? 'none' : 'block';

            // Renderiza as linhas da tabela
            expenseTransactions.forEach((t) => {
                const tipoObj = findTypeBy('id', t.tipoId);
                const mainType = tipoObj?.main || 'Despesa';
                let colorClass = 'text-red-600', icon = 'fa-solid fa-arrow-down';
                if(mainType === 'Estorno') { colorClass = 'text-green-600'; icon = 'fa-solid fa-receipt'; }
                else if (mainType === 'Investimento') { colorClass = 'text-blue-600'; icon = 'fa-solid fa-piggy-bank'; }

                let description = t.descricao;
                if (t.installments) { description += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total} de ${formatCurrency(t.installments.totalValue)})</span>`; }
                else if (t.recurring) { description += ` <span class="text-xs font-mono text-purple-500">(Fixa)</span>`; }

                const cartao = settings.cartoes.find(c => c.id == t.cartaoId);
                
                let lastInstallmentDate = '---';
                if (t.installments) {
                    const firstDate = new Date(t.data + 'T00:00:00');
                    firstDate.setMonth(firstDate.getMonth() - (t.installments.current - 1));
                    const lastDate = new Date(firstDate);
                    lastDate.setMonth(firstDate.getMonth() + t.installments.total - 1);
                    lastInstallmentDate = lastDate.toLocaleDateString('pt-BR');
                }

                const isOverdue = !t.pago && new Date(t.data + 'T00:00:00') < today;
                const dateDisplay = `${new Date(t.data+'T00:00:00').toLocaleDateString('pt-BR')} ${isOverdue ? '<i class="fa-solid fa-triangle-exclamation text-red-500 ml-1" title="Vencido"></i>' : ''}`;
                
                // 3. Busca o ID sequencial original do mapa, em vez de usar o índice do loop.
                const sequentialId = sequentialIdMap.get(t.id);

                const row = document.createElement('tr');
                row.className = `border-b hover:bg-gray-50 ${t.pago ? 'transaction-paid' : ''}`;
                row.innerHTML = `
                    <td class="px-6 py-4"><input type="checkbox" class="select-transaction-checkbox" data-id="${t.id}" ${selectedTransactionIds.includes(t.id) ? 'checked' : ''}></td>
                    <td class="px-2 py-4 text-center text-gray-500 font-mono">${sequentialId}</td>
                    <td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center ${mainType === 'Despesa' ? 'bg-red-100' : (mainType === 'Investimento' ? 'bg-blue-100' : 'bg-green-100')}"><i class="${icon} ${colorClass}"></i></div><div class="font-semibold text-gray-800 description">${description}</div></div></td>
                    <td class="px-6 py-4 whitespace-nowrap">${dateDisplay}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastInstallmentDate}</td>
                    <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">${t.categoria}</span></td>
                    <td class="px-6 py-4 text-gray-600 whitespace-nowrap"><i class="fa-regular fa-credit-card mr-2"></i>${cartao ? cartao.name : '---'}</td>
                    <td class="px-6 py-4 text-right font-mono font-semibold ${colorClass} whitespace-nowrap">${mainType === 'Estorno' ? '+' : '-'} ${formatCurrency(t.valor)}</td>
                    <td class="px-6 py-4 text-center"><div class="flex justify-center items-center gap-3"><button class="quit-btn text-gray-400 hover:text-green-500" data-id="${t.id}">${t.pago ? '<i class="fa-solid fa-check-circle text-green-500"></i>' : '<i class="fa-solid fa-check"></i>'}</button><button class="edit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}"><i class="fa-solid fa-pen-to-square"></i></button><button class="delete-btn text-gray-400 hover:text-red-500" data-id="${t.id}"><i class="fa fa-trash-alt"></i></button></div></td>`;
                expenseTableBody.appendChild(row);
            });
            
            // Lógica do rodapé para usar a lista filtrada 'expenseTransactions'
            const totalExibido = expenseTransactions.reduce((sum, t) => {
                const tipoObj = findTypeBy('id', t.tipoId);
                return sum + (tipoObj?.main === 'Estorno' ? -t.valor : t.valor);
            }, 0);

            expenseTableFooterContainer.innerHTML = '';
            let labelTotal = 'Total Exibido:';
            let corTotal = 'text-gray-800';

            if (!expenseSearchTerm && activeFilters.cardId === 'all') {
                if (activeFilters.status === 'pagas') {
                    labelTotal = 'Total Pago:';
                    corTotal = 'text-green-600';
                } else if (activeFilters.status !== 'pagas') { // 'todas', 'nao-pagas', 'vencidas'
                    labelTotal = 'Total a Pagar:';
                    corTotal = 'text-red-600';
                }
            }
            
            if (totalExibido > 0 || expenseTransactions.length > 0) {
                expenseTableFooterContainer.innerHTML = `<div class="flex justify-end items-center px-6 py-3 border-t"><span class="text-right font-bold text-gray-800 mr-4">${labelTotal}</span><span class="font-bold ${corTotal} w-32 text-right">${formatCurrency(totalExibido)}</span><div class="w-20"></div></div>`;
            }
        };

        const renderInvoicesView = (personalTransactions) => {
            faturasViewContent.innerHTML = '';
            let contentFound = false; let creditCardData = []; let otherGroupsData = [];
            const createInvoiceCardHTML = (config) => {
                const { title, icon, color, transactions, groupType, groupId, subtitle } = config;
                const estornos = transactions.filter(t => findTypeBy('id', t.tipoId)?.main === 'Estorno');
                const despesasNormais = transactions.filter(t => findTypeBy('id', t.tipoId)?.main !== 'Estorno');
                const totalEstornos = estornos.reduce((sum, t) => sum + t.valor, 0);
                const totalPagar = despesasNormais.filter(t => !t.pago).reduce((sum, t) => sum + t.valor, 0) - totalEstornos;
                const totalPago = despesasNormais.filter(t => t.pago).reduce((sum, t) => sum + t.valor, 0);
                const totalFaturaBruta = despesasNormais.reduce((sum, t) => sum + t.valor, 0);
                const totalFaturaLiquida = totalFaturaBruta - totalEstornos;
                const allPaid = totalPagar <= 0 && despesasNormais.length > 0;
                const isOverdue = despesasNormais.some(t => !t.pago && new Date(t.data + 'T00:00:00') < today);

                let statusStamp = '';
                if(allPaid) {
                    statusStamp = '<div class="status-stamp paid-stamp">Pago</div>';
                } else if (isOverdue) {
                    statusStamp = '<div class="status-stamp overdue-stamp">Vencido</div>';
                }

                const sortKey = `${groupType}_${groupId}`;
                const currentSort = invoiceSortState[sortKey] || 'date-asc';
                const sortedTransactions = [...transactions].sort((a, b) => {
                    switch(currentSort) {
                        case 'name': return a.descricao.localeCompare(b.descricao);
                        case 'date-desc': return new Date(b.data) - new Date(a.data);
                        default: return new Date(a.data) - new Date(b.data);
                    }
                });
                let transactionsHtml = sortedTransactions.map(t => {
                    let desc = t.descricao;
                    const isEstorno = findTypeBy('id', t.tipoId)?.main === 'Estorno';
                    const isItemOverdue = !t.pago && new Date(t.data + 'T00:00:00') < today;
                    if (t.installments) { desc += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total})</span>`; }

                    const quitButtonHtml = !t.pago && !isEstorno ? `<button class="quick-quit-btn text-gray-400 hover:text-green-500" data-id="${t.id}" title="Quitar"><i class="fa-solid fa-check"></i></button>` : `<div class="w-6"></div>`;

                    return `<li class="flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-b-0 ${t.pago ? 'opacity-60' : ''}">
                                <div class="flex-grow truncate pr-4">
                                    <span class="${t.pago ? 'line-through' : ''}">${desc}</span>
                                    ${isItemOverdue ? '<i class="fa-solid fa-triangle-exclamation text-red-500 ml-1" title="Vencido"></i>' : ''}
                                </div>
                                <div class="flex items-center gap-3 flex-shrink-0">
                                    <span class="font-mono whitespace-nowrap ${isEstorno ? 'text-green-600' : (t.pago ? 'text-gray-500' : 'text-gray-800')}">${isEstorno ? '+' : ''}${formatCurrency(t.valor)}</span>
                                    ${quitButtonHtml}
                                    <button class="edit-invoice-item-btn text-gray-400 hover:text-blue-500" data-id="${t.id}"><i class="fa-solid fa-pen-to-square fa-xs"></i></button>
                                    <button class="delete-invoice-item-btn text-gray-400 hover:text-red-500" data-id="${t.id}"><i class="fa fa-trash-alt fa-xs"></i></button>
                                </div>
                            </li>`;
                }).join('');
                return `<div class="invoice-card border-l-4 ${color}">${statusStamp}
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex-grow">
                                    <div class="flex items-center gap-3">
                                        <h4 class="font-bold text-lg text-gray-700"><i class="${icon} mr-2"></i>${title}</h4>
                                        <button data-group-type="${groupType}" data-id="${groupId}" data-subtitle="${subtitle || ''}" class="whatsapp-share-btn text-green-500 hover:text-green-600" title="Compartilhar no WhatsApp"><i class="fa-brands fa-whatsapp fa-lg"></i></button>
                                        <div class="sort-controls flex gap-2 text-xs text-gray-400">
                                            <button data-sort="date-asc" data-group-key="${sortKey}" class="sort-btn ${currentSort === 'date-asc' ? 'active' : ''}" title="Ordenar por Data (Crescente)"><i class="fa-solid fa-arrow-up-1-9"></i></button>
                                            <button data-sort="date-desc" data-group-key="${sortKey}" class="sort-btn ${currentSort === 'date-desc' ? 'active' : ''}" title="Ordenar por Data de Lançamento (Decrescente)"><i class="fa-solid fa-arrow-down-9-1"></i></button>
                                            <button data-sort="name" data-group-key="${sortKey}" class="sort-btn ${currentSort === 'name' ? 'active' : ''}" title="Ordenar por Nome"><i class="fa-solid fa-font"></i></button>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-500">${subtitle || `${transactions.length} transações`}</p>
                                </div>
                            </div>
                            <div class="space-y-2 mb-4">${totalEstornos > 0 ? `<div class="flex justify-between text-xs text-gray-500"><span>Total Bruto:</span><span class="font-medium">${formatCurrency(totalFaturaBruta)}</span></div><div class="flex justify-between text-xs text-green-600"><span>Créditos/Estornos:</span><span class="font-medium">- ${formatCurrency(totalEstornos)}</span></div><div class="flex justify-between text-sm font-semibold border-t pt-1 mt-1"><span>Total da Fatura:</span><span class="font-medium">${formatCurrency(totalFaturaLiquida)}</span></div>` : `<div class="flex justify-between text-sm font-semibold"><span>Total da Fatura:</span><span class="font-medium">${formatCurrency(totalFaturaLiquida)}</span></div>`}<div class="flex justify-between text-xs text-green-600"><span>Contas Pagas:</span><span class="font-medium">${formatCurrency(totalPago)}</span></div></div><div class="border-t pt-2"><p class="text-sm font-semibold text-gray-800">Valor a Pagar:</p><p class="font-bold text-2xl ${allPaid ? 'text-green-500' : 'text-red-600'}">${formatCurrency(totalPagar)}</p></div><div class="border-t pt-2 mt-4"><div class="invoice-list"><ul>${transactionsHtml || '<li class="text-gray-400 text-center text-sm py-2">Nenhuma transação.</li>'}</ul></div>${transactions.length > 5 ? '<button class="toggle-list-btn text-blue-500 text-sm mt-2 hover:underline w-full text-center">Ver mais</button>' : ''}</div><div class="flex gap-2 mt-4"><button data-group-type="${groupType}" data-id="${groupId}" class="quit-group-btn w-full py-2 px-4 text-sm font-medium rounded-lg ${allPaid ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}">${allPaid ? 'Estornar Pagamento' : `Quitar ${title}`}</button>${groupType === 'card' ? `<button data-card-id="${groupId}" class="reversal-btn w-full py-2 px-4 text-sm font-medium rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white">Lançar Estorno</button>` : ''}</div>
                        </div>`;
            };
            settings.cartoes.forEach(card => {
                const cardTransactions = personalTransactions.filter(t => t.cartaoId === card.id);
                if (cardTransactions.length > 0) {
                    contentFound = true; let dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), card.diaVencimento); if (currentDate.getDate() > card.diaVencimento) { dueDate.setMonth(dueDate.getMonth() + 1); }
                    creditCardData.push({ dueDate: dueDate, htmlConfig: { title: `Fatura ${card.name}`, icon: 'fa-solid fa-credit-card', color: 'border-blue-500', subtitle: `Vencimento dia ${card.diaVencimento}`, transactions: cardTransactions, groupType: 'card', groupId: card.id }});
                }
            });
            creditCardData.sort((a, b) => a.dueDate - b.dueDate);
            const nonCardExpenses = personalTransactions.filter(t => !t.cartaoId && findTypeBy('id', t.tipoId)?.main === 'Despesa');
            if (ocultoCardDespesasGerais) {
                const fixed = nonCardExpenses.filter(t => t.recurring); if(fixed.length > 0) { contentFound = true; otherGroupsData.push({ htmlConfig: { title: 'Contas Fixas', icon: 'fa-solid fa-repeat', color: 'border-purple-500', transactions: fixed, groupType: 'fixed', groupId: 'fixed' } }); }
                const installments = nonCardExpenses.filter(t => t.installments); if(installments.length > 0) { contentFound = true; otherGroupsData.push({ htmlConfig: { title: 'Parcelas', icon: 'fa-solid fa-list-ol', color: 'border-orange-500', transactions: installments, groupType: 'installments', groupId: 'installments' } }); }
                const single = nonCardExpenses.filter(t => !t.recurring && !t.installments); if(single.length > 0) { contentFound = true; otherGroupsData.push({ htmlConfig: { title: 'Contas Avulsas', icon: 'fa-solid fa-file-invoice', color: 'border-yellow-500', transactions: single, groupType: 'single', groupId: 'single' } }); }
            } else { if (nonCardExpenses.length > 0) { contentFound = true; otherGroupsData.push({ htmlConfig: { title: 'Despesas Gerais', icon: 'fa-solid fa-layer-group', color: 'border-purple-500', transactions: nonCardExpenses, groupType: 'general', groupId: 'general' } }); } }
            faturasViewContent.innerHTML = [...creditCardData, ...otherGroupsData].map(card => createInvoiceCardHTML(card.htmlConfig)).join('');
            const toggleBtn = document.getElementById('toggle-grouping-btn');
            if(toggleBtn){ toggleBtn.textContent = ocultoCardDespesasGerais ? 'Agrupar Contas' : 'Separar Contas'; toggleBtn.onclick = () => { ocultoCardDespesasGerais = !ocultoCardDespesasGerais; renderInvoicesView(getTransactionsForMonth(currentDate).filter(t => !t.thirdParty)); }; }
            emptyStateFaturas.style.display = contentFound ? 'none' : 'block';
        };

        const openModal = (modalElement) => { modalBackdrop.classList.remove('hidden'); modalElement.classList.remove('hidden'); };
        const closeModal = () => { modalBackdrop.classList.add('hidden'); allModals.forEach(m => m.classList.add('hidden')); };
        const showFormError = (form, fieldName, message) => {
            const field = form.querySelector(`[name="${fieldName}"]`); if (!field) return;
            const errorElement = document.createElement('p'); errorElement.className = 'error-message'; errorElement.textContent = message;
            const oldError = field.parentElement.querySelector('.error-message') || field.parentElement.parentElement.querySelector('.error-message');
            if(oldError) oldError.remove();
            field.parentElement.appendChild(errorElement);
        };
        const clearFormErrors = (form) => form.querySelectorAll('.error-message').forEach(el => el.remove());

        
const openAddEditTransactionModal = (transaction = null) => {
    const isEditing = transaction !== null;
    let formValue = '';
    if (isEditing) {
        const displayValue = transaction.valor < 0 ? -transaction.valor : transaction.valor;
        // CORREÇÃO: Usa a função de formatação para exibir o valor corretamente
        formValue = formatCurrencyInput(String(displayValue * 100)); 
    }
    
    const isEstorno = isEditing && findTypeBy('id', transaction.tipoId)?.main === 'Estorno';
    const isPaymentReceived = isEditing && findTypeBy('id', transaction.tipoId)?.main === 'Recebimento';

    const modal = document.getElementById('addEditTransactionModal');
    modal.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-gray-800">${isEditing ? 'Editar' : 'Nova'} Transação</h3><button class="close-modal-btn text-gray-400 hover:text-gray-600"><i class="fa fa-times fa-lg"></i></button></div>
            <form id="transaction-form" novalidate>
                <input type="hidden" name="id" value="${isEditing ? transaction.id : ''}">
                
                <div class="mb-4"><label for="tipo" class="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select id="tipo" name="tipoId" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required ${(isEstorno || isPaymentReceived) ? 'disabled' : ''}></select></div>
                <div class="mb-4"><label for="categoria" class="block text-sm font-medium text-gray-700 mb-1">Categoria</label><select id="categoria" name="categoria" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required ${isEstorno ? 'disabled' : ''}></select></div>
                <div id="credit-card-wrapper" class="mb-4 hidden"><label for="cartao" class="block text-sm font-medium text-gray-700 mb-1">Cartão de Crédito (Opcional)</label><select id="cartao" name="cartaoId" class="w-full px-3 py-2 border border-gray-300 rounded-lg" ${isEstorno ? 'disabled' : ''}></select></div>
                <div class="mb-4"><label for="transacao" class="block text-sm font-medium text-gray-700 mb-1">Descrição</label><input type="text" id="transacao" name="transacao" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required value="${isEditing ? transaction.descricao : ''}"></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="valor" class="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                        <input type="text" id="valor" name="valor" inputmode="decimal" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="R$ 0,00" required value="${formValue}" oninput="this.value = formatCurrencyInput(this.value)">
                    </div>
                    <div><label for="data" class="block text-sm font-medium text-gray-700 mb-1">Data</label><input type="date" id="data" name="data" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required value="${isEditing ? transaction.data : ''}"></div>
                </div>
                <div id="third-party-wrapper" class="mb-4 hidden">
                    <label for="thirdParty" class="block text-sm font-medium text-gray-700 mb-1">Despesa para Terceiro</label>
                    <input type="text" id="thirdParty" name="thirdParty" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Nome da pessoa" value="${isEditing && transaction.thirdParty ? transaction.thirdParty : ''}">
                </div>
                <div id="advanced-options" class="space-y-4 p-4 bg-gray-50 rounded-lg mb-6 ${(isEstorno || isPaymentReceived) ? 'hidden' : ''}">
                    <div id="expense-options">
                        <!-- NOVA LÓGICA DE PARCELAMENTO -->
                        <div class="space-y-4">
                            <div class="flex items-center">
                                <input id="is-installment-check" name="is-installment" type="checkbox" class="h-4 w-4 rounded border-gray-300">
                                <label for="is-installment-check" class="ml-3 block text-sm font-medium text-gray-900">Lançar parcelas?</label>
                            </div>
                            <div id="installment-fields" class="hidden space-y-4">
                                <div>
                                    <label for="total-installments" class="block text-sm font-medium text-gray-700">Número de Parcelas Totais</label>
                                    <input type="number" name="total-installments" id="total-installments" min="2" value="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">É a primeira parcela?</label>
                                    <div class="mt-1 flex items-center space-x-4">
                                        <label class="inline-flex items-center">
                                            <input type="radio" name="installmentStatus" value="first" class="form-radio" checked>
                                            <span class="ml-2 text-gray-700">Sim</span>
                                        </label>
                                        <label class="inline-flex items-center">
                                            <input type="radio" name="installmentStatus" value="notFirst" class="form-radio">
                                            <span class="ml-2 text-gray-700">Não</span>
                                        </label>
                                    </div>
                                </div>
                                <div id="initial-installment-wrapper" class="hidden">
                                    <label for="initial-installment-number" class="block text-sm font-medium text-gray-700">Contagem da parcela Inicial</label>
                                    <input type="number" id="initial-installment-number" name="initial-installment-number" min="1" value="1" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                </div>
                            </div>
                        </div>
                        <!-- FIM DA NOVA LÓGICA DE PARCELAMENTO -->

                        <div class="flex items-center mt-2"><input id="is-recurring-check" name="is-recurring" type="checkbox" class="h-4 w-4 rounded border-gray-300"><label for="is-recurring-check" class="ml-3 block text-sm font-medium text-gray-900">Conta Fixa (repetir por 12 meses)</label></div>
                    </div>
                    <div id="income-options" class="hidden">
                        <div class="flex items-center"><input id="is-recurring-income-check" name="is-recurring-income" type="checkbox" class="h-4 w-4 rounded border-gray-300"><label for="is-recurring-income-check" class="ml-3 block text-sm font-medium text-gray-900">Receita Fixa (repetir por 12 meses)</label></div>
                    </div>
                </div>

                <div class="flex justify-end"><button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700">${isEditing ? 'Salvar Alterações' : 'Adicionar Transação'}</button></div>
            </form>
        </div>`;
    
    // ... (O restante da função de setup dos campos continua igual)
    const form = modal.querySelector('#transaction-form');
    const tipoSelect = form.querySelector('#tipo');
    const creditCardWrapper = form.querySelector('#credit-card-wrapper');
    const thirdPartyWrapper = form.querySelector('#third-party-wrapper');
    const cartaoSelect = form.querySelector('#cartao');
    const dataInput = form.querySelector('#data');

    const expenseOptions = form.querySelector('#expense-options');
    const incomeOptions = form.querySelector('#income-options');
    const installmentCheck = form.querySelector('#is-installment-check');
    const installmentFields = form.querySelector('#installment-fields');
    const installmentFieldsWrapper = form.querySelector('#initial-installment-wrapper');
    const recurringCheck = form.querySelector('#is-recurring-check');
    const recurringIncomeCheck = form.querySelector('#is-recurring-income-check');
    const installmentStatusRadios = document.querySelectorAll('input[name="installmentStatus"]');

    installmentCheck.addEventListener('change', () => {
        installmentFields.classList.toggle('hidden', !installmentCheck.checked);
    });

    installmentStatusRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'notFirst') {
                installmentFieldsWrapper.classList.remove('hidden');
            } else {
                installmentFieldsWrapper.classList.add('hidden');
            }
        });
    });

    installmentCheck.onchange = (e) => {
        installmentFields.classList.toggle('hidden', !e.target.checked);
        recurringCheck.disabled = e.target.checked;
        if (e.target.checked) recurringCheck.checked = false;
    };
    recurringCheck.onchange = (e) => {
        installmentCheck.disabled = e.target.checked;
        if (e.target.checked) {
            installmentCheck.checked = false;
            installmentFields.classList.add('hidden');
        }
    };

    const populateTransactionSelects = (form) => {
        const categoriaSelect = form.querySelector('#categoria');
        const tipoSelect = form.querySelector('#tipo');
        const cartaoSelect = form.querySelector('#cartao');

        tipoSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';
        settings.tipos.sort((a, b) => a.name.localeCompare(b.name));
        settings.tipos.filter(t => t.main !== 'Estorno').forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id;
            option.textContent = tipo.name;
            tipoSelect.appendChild(option);
        });

        cartaoSelect.innerHTML = '<option value="">Nenhum</option>';
        settings.cartoes.sort((a, b) => a.name.localeCompare(b.name));
        settings.cartoes.forEach(cartao => {
            const option = document.createElement('option');
            option.value = cartao.id;
            option.textContent = cartao.name;
            cartaoSelect.appendChild(option);
        });

        cartaoSelect.onchange = () => {
            const cardId = cartaoSelect.value;
            if (!cardId) return;
            const card = settings.cartoes.find(c => c.id == cardId);
            if (!card) return;
            const dueDate = parseInt(card.diaVencimento);
            let transactionDate = new Date();
            if (transactionDate.getDate() > dueDate) {
                transactionDate.setMonth(transactionDate.getMonth() + 1);
            }
            transactionDate.setDate(dueDate);
            dataInput.value = transactionDate.toISOString().split('T')[0];
        };

        tipoSelect.onchange = () => {
            const tipoId = tipoSelect.value;
            const tipoObj = settings.tipos.find(t => t.id.toString() === tipoId);
            const mainType = tipoObj ? tipoObj.main : null;

            creditCardWrapper.classList.toggle('hidden', mainType !== 'Despesa');
            thirdPartyWrapper.classList.toggle('hidden', mainType !== 'Despesa');

            if (mainType === 'Receita') {
                expenseOptions.classList.add('hidden');
                incomeOptions.classList.remove('hidden');
            } else {
                expenseOptions.classList.remove('hidden');
                incomeOptions.classList.add('hidden');
            }

            categoriaSelect.innerHTML = '';
            if (settings.categorias[tipoId]) {
                const categorias = settings.categorias[tipoId];
                categorias.sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
                categorias.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    categoriaSelect.appendChild(option);
                });
            }
        };
    };


    populateTransactionSelects(form);
    if (isEditing) {
        if (isEstorno || isPaymentReceived) {
            const option = document.createElement('option');
            option.value = transaction.tipoId;
            option.textContent = findTypeBy('id', transaction.tipoId)?.name;
            tipoSelect.prepend(option);
        }

        tipoSelect.value = transaction.tipoId;
        tipoSelect.dispatchEvent(new Event('change'));
        form.querySelector('#categoria').value = transaction.categoria;
        if(transaction.cartaoId) {
            cartaoSelect.value = transaction.cartaoId;
        }
        if (transaction.installments) {
            installmentCheck.checked = true;
            installmentFields.classList.remove('hidden');
            form.querySelector('[name="total-installments"]').value = transaction.installments.total;
            recurringCheck.disabled = true;
        }
        if (transaction.recurring) {
            const tipoObj = findTypeBy('id', transaction.tipoId);
            if (tipoObj && tipoObj.main === 'Receita') {
                recurringIncomeCheck.checked = true;
            } else {
                recurringCheck.checked = true;
            }
            installmentCheck.disabled = true;
        }

    } else {
        dataInput.valueAsDate = new Date();
    }
        // form.onsubmit = async (e) => {
        //     e.preventDefault();
        //     if (!currentUser) return;
        //     clearFormErrors(form);

        //     const formData = new FormData(form);
        //     const idToEdit = formData.get('id');
        //     let valorNum = parseCurrency(formData.get('valor'));
        //     if (isNaN(valorNum) || valorNum <= 0) {
        //         return showFormError(form, 'valor', 'Valor inválido.');
        //     }
            
        //     const tipoId = (form.querySelector('#tipo').disabled && isEditing) ? transaction.tipoId : parseInt(formData.get('tipoId'));
        //     const tipoObj = findTypeBy('id', tipoId);
        //     const thirdPartyName = formData.get('thirdParty')?.trim() || null;
            
        //     const originalTransaction = isEditing ? transactions.find(t => t.id === idToEdit) : null;
            
        //     // --- INÍCIO DA ALTERAÇÃO: LANÇAR RECEITA COMO PAGA ---
        //     const isReceita = tipoObj?.main === 'Receita';
        //     let pagoStatus = isEditing ? (originalTransaction?.pago || false) : false;

        //     if (!isEditing && isReceita) {
        //         pagoStatus = true; // Define como pago se for uma NOVA receita
        //     }
        //     // --- FIM DA ALTERAÇÃO ---

        //     const transactionData = {
        //         descricao: formData.get('transacao'),
        //         valor: valorNum,
        //         data: formData.get('data'),
        //         tipoId: tipoId,
        //         categoria: formData.get('categoria'),
        //         cartaoId: formData.get('cartaoId') ? parseInt(formData.get('cartaoId')) : null,
        //         thirdParty: thirdPartyName,
        //         thirdPartyPaid: (isEditing && transaction.thirdPartyPaid) || false,
        //         pago: pagoStatus // Utiliza a nova variável pagoStatus
        //     };

        //     const isInstallment = formData.get('is-installment') === 'on';
        //     const isRecurring = formData.get('is-recurring') === 'on';
        //     const isRecurringIncome = formData.get('is-recurring-income') === 'on';
            
        //     if (isEditing && originalTransaction && originalTransaction.groupId) {
        //         openEditInstallmentGroupConfirmModal(transactionData, originalTransaction, isInstallment, isRecurring, isRecurringIncome);
        //         return;
        //     }

        //     const transactionsColRef = collection(db, 'users', currentUser.uid, 'transactions');
            
        //     if (isEditing && (!originalTransaction || !originalTransaction.groupId) && (isInstallment || isRecurring || isRecurringIncome)) {
        //         await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', idToEdit));
        //         transactions = transactions.filter(t => t.id !== idToEdit);
        //     } else if (isEditing) {
        //         const docRef = doc(db, 'users', currentUser.uid, 'transactions', idToEdit);
        //         await updateDoc(docRef, transactionData);
        //         const index = transactions.findIndex(t => t.id == idToEdit);
        //         if (index > -1) transactions[index] = { ...transactions[index], ...transactionData };
        //         closeModal();
        //         updateUIForMonth();
        //         return;
        //     }

        //     // --- INÍCIO DA NOVA LÓGICA DE PARCELAMENTO ---
        //     if (isInstallment) {
        //         const totalInstallments = parseInt(formData.get('total-installments'), 10);
        //         const isFirstInstallment = form.querySelector('input[name="installmentStatus"]:checked').value === 'first';
        //         const initialInstallmentNumber = isFirstInstallment ? 1 : parseInt(form.querySelector('#tp-initial-installment-number').value, 10);

        //         if (isNaN(totalInstallments) || totalInstallments <= 1) {
        //             return showFormError(form, 'total-installments', 'Número de parcelas inválido. Deve ser 2 ou mais.');
        //         }

        //         if (initialInstallmentNumber > totalInstallments) {
        //             openGenericConfirmModal({
        //                 title: 'Ação Inválida',
        //                 message: `O número da parcela inicial (${initialInstallmentNumber}) não pode ser maior que o total de parcelas (${totalInstallments}).`,
        //                 confirmText: 'Entendi',
        //                 iconClass: 'fa-solid fa-ban text-red-500'
        //             });
        //             return;
        //         }

        //         const installmentValue = transactionData.valor;
        //         const totalValue = installmentValue * totalInstallments;
        //         const baseDate = new Date(transactionData.data + 'T00:00:00');
        //         const newGroupId = Date.now();

        //         // O loop agora começa do número da parcela inicial
        //         for (let i = initialInstallmentNumber; i <= totalInstallments; i++) {
        //             const installmentDate = new Date(baseDate);
        //             installmentDate.setMonth(baseDate.getMonth() + (i - initialInstallmentNumber));
        //             const newInstallment = {
        //                 ...transactionData,
        //                 groupId: newGroupId,
        //                 valor: installmentValue,
        //                 data: installmentDate.toISOString().split('T')[0],
        //                 installments: { current: i, total: totalInstallments, totalValue: totalValue }
        //             };
        //             const docRef = await addDoc(transactionsColRef, newInstallment);
        //             transactions.push({ ...newInstallment, id: docRef.id });
        //         }
        //     // --- FIM DA NOVA LÓGICA DE PARCELAMENTO ---
        //     } else if (isRecurring || isRecurringIncome) {
        //         const totalRecurring = 12;
        //         const baseDate = new Date(transactionData.data + 'T00:00:00');
        //         const newGroupId = Date.now();
        //         for (let i = 0; i < totalRecurring; i++) {
        //             const recurringDate = new Date(baseDate);
        //             recurringDate.setMonth(baseDate.getMonth() + i);
        //             const newRecurring = { ...transactionData, groupId: newGroupId, data: recurringDate.toISOString().split('T')[0], recurring: true };
        //             const docRef = await addDoc(transactionsColRef, newRecurring);
        //             transactions.push({ ...newRecurring, id: docRef.id });
        //         }
        //     } else {
        //         const docRef = await addDoc(transactionsColRef, transactionData);
        //         transactions.push({ ...transactionData, id: docRef.id });
        //     }

        //     closeModal();
        //     updateUIForMonth();
        // };
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUser) return;
            clearFormErrors(form);
        
            const formData = new FormData(form);
            const idToEdit = formData.get('id');
            let valorNum = parseCurrency(formData.get('valor'));
            if (isNaN(valorNum) || valorNum <= 0) {
                return showFormError(form, 'valor', 'Valor inválido.');
            }
            
            const tipoId = (form.querySelector('#tipo').disabled && isEditing) ? transaction.tipoId : parseInt(formData.get('tipoId'));
            const tipoObj = findTypeBy('id', tipoId);
            const thirdPartyName = formData.get('thirdParty')?.trim() || null;
            
            const originalTransaction = isEditing ? transactions.find(t => t.id === idToEdit) : null;
            
            const isReceita = tipoObj?.main === 'Receita';
            let pagoStatus = isEditing ? (originalTransaction?.pago || false) : false;
        
            if (!isEditing && isReceita) {
                pagoStatus = true;
            }
        
            const transactionData = {
                descricao: formData.get('transacao'),
                valor: valorNum,
                data: formData.get('data'),
                tipoId: tipoId,
                categoria: formData.get('categoria'),
                cartaoId: formData.get('cartaoId') ? parseInt(formData.get('cartaoId')) : null,
                thirdParty: thirdPartyName,
                thirdPartyPaid: (isEditing && transaction.thirdPartyPaid) || false,
                pago: pagoStatus
            };
        
            const isInstallment = formData.get('is-installment') === 'on';
            const isRecurring = formData.get('is-recurring') === 'on';
            const isRecurringIncome = formData.get('is-recurring-income') === 'on';
            
            if (isEditing && originalTransaction && originalTransaction.groupId) {
                openEditInstallmentGroupConfirmModal(transactionData, originalTransaction, isInstallment, isRecurring, isRecurringIncome);
                return;
            }
        
            const transactionsColRef = collection(db, 'users', currentUser.uid, 'transactions');
            
            if (isEditing && (!originalTransaction || !originalTransaction.groupId) && (isInstallment || isRecurring || isRecurringIncome)) {
                await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', idToEdit));
                transactions = transactions.filter(t => t.id !== idToEdit);
            } else if (isEditing) {
                const docRef = doc(db, 'users', currentUser.uid, 'transactions', idToEdit);
                await updateDoc(docRef, transactionData);
                const index = transactions.findIndex(t => t.id == idToEdit);
                if (index > -1) transactions[index] = { ...transactions[index], ...transactionData };
                closeModal();
                updateUIForMonth();
                return;
            }
        
            if (isInstallment) {
                // Coletando os novos dados do formulário de parcelamento
                const totalInstallments = parseInt(formData.get('total-installments'), 10);
                const isFirstInstallment = form.querySelector('input[name="installmentStatus"]:checked').value === 'first';
                // Obtém o número da parcela inicial, ajustando para 1 se for a primeira
                const initialInstallmentNumber = isFirstInstallment ? 1 : parseInt(form.querySelector('#initial-installment-number').value, 10);
        
                // Validação adicional para a lógica de parcelamento
                if (isNaN(totalInstallments) || totalInstallments <= 1) {
                    return showFormError(form, 'total-installments', 'Número de parcelas inválido. Deve ser 2 ou mais.');
                }
        
                if (initialInstallmentNumber > totalInstallments) {
                    openGenericConfirmModal({
                        title: 'Ação Inválida',
                        message: `O número da parcela inicial (${initialInstallmentNumber}) não pode ser maior que o total de parcelas (${totalInstallments}).`,
                        confirmText: 'Entendi',
                        iconClass: 'fa-solid fa-ban text-red-500'
                    });
                    return;
                }
        
                const installmentValue = transactionData.valor;
                const totalValue = installmentValue * totalInstallments;
                const baseDate = new Date(transactionData.data + 'T00:00:00');
                const newGroupId = Date.now();
        
                // O loop agora começa do número da parcela inicial e vai até o total de parcelas
                for (let i = initialInstallmentNumber; i <= totalInstallments; i++) {
                    const installmentDate = new Date(baseDate);
                    // A data é ajustada para os meses seguintes com base no número da parcela inicial
                    installmentDate.setMonth(baseDate.getMonth() + (i - initialInstallmentNumber));
                    
                    const newInstallment = {
                        ...transactionData,
                        groupId: newGroupId,
                        valor: installmentValue,
                        data: installmentDate.toISOString().split('T')[0],
                        installments: { current: i, total: totalInstallments, totalValue: totalValue }
                    };
                    const docRef = await addDoc(transactionsColRef, newInstallment);
                    transactions.push({ ...newInstallment, id: docRef.id });
                }
            } else if (isRecurring || isRecurringIncome) {
                const totalRecurring = 12;
                const baseDate = new Date(transactionData.data + 'T00:00:00');
                const newGroupId = Date.now();
                for (let i = 0; i < totalRecurring; i++) {
                    const recurringDate = new Date(baseDate);
                    recurringDate.setMonth(baseDate.getMonth() + i);
                    const newRecurring = { ...transactionData, groupId: newGroupId, data: recurringDate.toISOString().split('T')[0], recurring: true };
                    const docRef = await addDoc(transactionsColRef, newRecurring);
                    transactions.push({ ...newRecurring, id: docRef.id });
                }
            } else {
                const docRef = await addDoc(transactionsColRef, transactionData);
                transactions.push({ ...transactionData, id: docRef.id });
            }
        
            closeModal();
            updateUIForMonth();
        };
        
    openModal(modal);
};

        const openGenericConfirmModal = (config) => {
            // Adicionada a opção 'hideCancelButton' para mais flexibilidade
            const { title, message, onConfirm, confirmText = 'Confirmar', confirmClass = 'bg-blue-600 hover:bg-blue-700', iconClass = 'fa-solid fa-question-circle text-blue-500', hideCancelButton = false } = config;
            const modal = document.getElementById('genericConfirmModal');
        
            // O botão de cancelar só é criado se 'hideCancelButton' for falso
            const cancelBtnHTML = hideCancelButton 
                ? '' 
                : '<button id="generic-cancel-btn" class="w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>';
        
            modal.innerHTML = `
                <div class="p-6 text-center">
                    <i class="${iconClass} text-4xl mb-4"></i>
                    <h3 class="text-lg font-bold text-gray-800 mb-2">${title}</h3>
                    <p class="text-sm text-gray-600 mb-6">${message}</p>
                    <div class="flex justify-center gap-4">
                        ${cancelBtnHTML}
                        <button id="generic-confirm-btn" class="w-full text-white font-bold py-2 px-4 rounded-lg ${confirmClass}">${confirmText}</button>
                    </div>
                </div>`;
        
            // AÇÃO PADRÃO: Se 'onConfirm' não for passado, o botão principal fechará o modal.
            modal.querySelector('#generic-confirm-btn').onclick = onConfirm || closeModal;
        
            // Adiciona o evento ao botão de cancelar apenas se ele existir no HTML
            if (!hideCancelButton) {
                modal.querySelector('#generic-cancel-btn').onclick = closeModal;
            }
            
            openModal(modal);
        };

        const openDeleteConfirmationModal = (transaction) => {
            const hasGroup = transaction.groupId && transactions.filter(t => t.groupId === transaction.groupId).length > 1;

            const deleteSingle = async () => {
                await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', transaction.id));
                transactions = transactions.filter(t => t.id !== transaction.id);
                updateUIForMonth();
                closeModal();
            };

            const deleteAll = async () => {
                let transactionsToDelete;
                if (transaction.recurring) {
                     transactionsToDelete = transactions.filter(t => t.groupId === transaction.groupId && new Date(t.data) >= new Date(transaction.data));
                } else {
                     transactionsToDelete = transactions.filter(t => t.groupId === transaction.groupId);
                }
                for (const t of transactionsToDelete) {
                    await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', t.id));
                }
                transactions = transactions.filter(t => !transactionsToDelete.some(del => del.id === t.id));
                updateUIForMonth();
                closeModal();
            };

            if (hasGroup) {
                const modal = document.getElementById('deleteConfirmModal');
                modal.innerHTML = `
                <div class="p-6 text-center"><i class="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i><h3 class="text-lg font-bold text-gray-800 mb-2">Excluir Transação Recorrente</h3>
                <p class="text-sm text-gray-600 mb-6">Esta é uma transação recorrente. Como você deseja excluí-la?</p>
                <div class="flex flex-col justify-center gap-4">
                    <button id="deleteSingleBtn" class="w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Excluir Somente Esta</button>
                    <button id="deleteAllBtn" class="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700"></button>
                </div>
                <button id="cancelDeleteBtn" class="w-full bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 mt-4">Cancelar</button></div>`;

                if (transaction.installments) {
                    modal.querySelector('#deleteAllBtn').textContent = `Excluir Todas as ${transaction.installments.total} Parcelas`;
                } else if (transaction.recurring) {
                    modal.querySelector('#deleteAllBtn').textContent = `Excluir Esta e as Futuras`;
                }
                modal.querySelector('#deleteSingleBtn').onclick = deleteSingle;
                modal.querySelector('#deleteAllBtn').onclick = deleteAll;
                modal.querySelector('#cancelDeleteBtn').onclick = closeModal;
                openModal(modal);
            } else {
                 openGenericConfirmModal({
                    title: 'Confirmar Exclusão',
                    message: `Você tem certeza que deseja excluir a transação <strong>"${transaction.descricao}"</strong> no valor de <strong>${formatCurrency(transaction.valor)}</strong>?`,
                    onConfirm: deleteSingle,
                    confirmText: 'Excluir',
                    confirmClass: 'bg-red-600 hover:bg-red-700',
                    iconClass: 'fa-solid fa-triangle-exclamation text-red-500'
                });
            }
        };

        const openTypesModal = (typeToEdit = null) => {
            const isEditing = typeToEdit !== null;
            const modal = document.getElementById('typesModal');

            modal.innerHTML = `
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-800">Gerenciar Tipos</h3>
                        <button class="close-modal-btn text-gray-400 hover:text-gray-600">
                            <i class="fa fa-times fa-lg"></i>
                        </button>
                    </div>
                    <div>
                        <h4 class="font-bold text-lg text-gray-700 mb-3 border-b pb-2">Tipos de Transação</h4>
                        <div id="types-list" class="space-y-2 mt-2 max-h-60 overflow-y-auto"></div>
                        <form id="add-type-form" class="mt-4 space-y-3 p-4 border rounded-lg bg-gray-50">
                            <input type="hidden" name="id" value="${isEditing ? typeToEdit.id : ''}">
                            <h5 class="font-semibold text-md text-gray-800">${isEditing ? 'Editar Tipo' : 'Adicionar Novo Tipo'}</h5>
                            <input type="text" name="name" placeholder="Nome do tipo" class="w-full border rounded-lg p-2" required value="${isEditing ? typeToEdit.name : ''}">
                            <select name="main" class="w-full border rounded-lg p-2 bg-white" required>
                                <option value="Despesa" ${isEditing && typeToEdit.main === 'Despesa' ? 'selected' : ''}>Despesa</option>
                                <option value="Receita" ${isEditing && typeToEdit.main === 'Receita' ? 'selected' : ''}>Receita</option>
                                <option value="Investimento" ${isEditing && typeToEdit.main === 'Investimento' ? 'selected' : ''}>Investimento</option>
                                <option value="Estorno" ${isEditing && typeToEdit.main === 'Estorno' ? 'selected' : ''}>Estorno</option>
                            </select>
                            <button type="submit" class="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600">
                                ${isEditing ? 'Salvar Alterações' : 'Adicionar Tipo'}
                            </button>
                            ${isEditing ? '<button type="button" id="cancel-edit-type-btn" class="w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600 mt-2">Cancelar Edição</button>' : ''}
                        </form>
                    </div>
                </div>`;

            const renderTypes = () => {
                const typesList = modal.querySelector('#types-list');
                typesList.innerHTML = '';

                settings.tipos.forEach(tipo => {
                    const isSystemType = ['Estorno', 'Retirada Poupança', 'Depósito Poupança'].includes(tipo.name);
                    typesList.innerHTML += `
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span>${tipo.name} <span class="text-xs text-gray-500">(${tipo.main})</span> ${isSystemType ? '<i class="fa-solid fa-lock fa-xs text-gray-400 ml-1" title="Tipo de sistema"></i>' : ''}</span>
                            ${!isSystemType ? `
                            <div class="flex gap-3">
                                <button class="edit-type-btn text-gray-400 hover:text-blue-500" data-id="${tipo.id}">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="delete-type-btn text-gray-400 hover:text-red-500" data-id="${tipo.id}">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>` : ''}
                        </div>`;
                });
            };

            modal.querySelector('#add-type-form').onsubmit = (e) => {
                e.preventDefault();
                const form = e.target;
                clearFormErrors(form);
                const name = form.elements.name.value.trim();
                const main = form.elements.main.value;
                const id = form.elements.id.value;

                if (!name) {
                    showFormError(form, 'name', 'Nome inválido.');
                    return;
                }

                const nameAlreadyExists = settings.tipos.some(t =>
                    t.name.toLowerCase() === name.toLowerCase() && t.id.toString() !== id
                );

                if (nameAlreadyExists) {
                    showFormError(form, 'name', 'Tipo já existe.');
                    return;
                }

                if (isEditing) {
                    const tipoIndex = settings.tipos.findIndex(t => t.id.toString() === id);
                    if (tipoIndex !== -1) {
                        const isInUse = transactions.some(t => t.tipoId === parseInt(id));
                        if (isInUse && settings.tipos[tipoIndex].name !== name) {
                            showFormError(form, 'name', 'Tipo em uso, não pode renomear.');
                            return;
                        }

                        settings.tipos[tipoIndex].name = name;
                        settings.tipos[tipoIndex].main = main;
                        saveSettings();
                        closeModal();
                        openTypesModal();
                    }
                } else {
                    settings.tipos.push({ id: Date.now(), name, main });
                    saveSettings();
                    renderTypes();
                    form.reset();
                }
            };

            modal.onclick = (e) => {
                const deleteBtn = e.target.closest('.delete-type-btn');
                const editBtn = e.target.closest('.edit-type-btn');
                const cancelEditBtn = e.target.closest('#cancel-edit-type-btn');

                if (cancelEditBtn) {
                    closeModal();
                    openTypesModal();
                }

                if (editBtn) {
                    const id = parseInt(editBtn.dataset.id);
                    const tipo = settings.tipos.find(t => t.id === id);
                    if (tipo) {
                        closeModal();
                        openTypesModal(tipo);
                    }
                }

                if (deleteBtn) {
                    const id = parseInt(deleteBtn.dataset.id);
                    const isInUse = transactions.some(t => t.tipoId === id);
                    if (isInUse) {
                        showFormError(modal.querySelector('#add-type-form'), 'name', 'Tipo em uso.');
                        return;
                    }

                    settings.tipos = settings.tipos.filter(t => t.id !== id);
                    saveSettings();
                    renderTypes();
                }
            };

            renderTypes();
            openModal(modal);
        };

        const openCategoriesModal = (categoryToEdit = null) => {
                const isEditing = categoryToEdit !== null;
                const modal = document.getElementById('categoriesModal');

                modal.innerHTML = `
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-xl font-bold text-gray-800">Gerenciar Categorias</h3>
                            <button class="close-modal-btn text-gray-400 hover:text-gray-600">
                                <i class="fa fa-times fa-lg"></i>
                            </button>
                        </div>
                        <div>
                            <h4 class="font-bold text-lg text-gray-700 mb-3 border-b pb-2">Categorias</h4>
                            <div id="category-management-list" class="space-y-4 mt-2 max-h-60 overflow-y-auto"></div>
                            <form id="add-category-form" class="mt-4 space-y-3 p-4 border rounded-lg bg-gray-50">
                                <input type="hidden" name="originalName" value="${isEditing ? categoryToEdit.name : ''}">
                                <input type="hidden" name="originalTipoId" value="${isEditing ? categoryToEdit.tipoId : ''}">
                                <h5 class="font-semibold text-md text-gray-800">${isEditing ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</h5>
                                <input type="text" name="name" placeholder="Nome da Categoria" class="w-full border rounded-lg p-2" required value="${isEditing ? categoryToEdit.name : ''}">
                                <select name="tipoId" class="w-full border rounded-lg p-2 bg-white" required>
                                    <option value="" disabled ${!isEditing ? 'selected' : ''}>Selecione o tipo</option>
                                    ${settings.tipos.map(t => `
                                        <option value="${t.id}" ${isEditing && t.id.toString() === categoryToEdit.tipoId?.toString() ? 'selected' : ''}>
                                            ${t.name} (${t.main})
                                        </option>`).join('')}
                                </select>
                                <button type="submit" class="w-full bg-green-500 text-white p-2 rounded-lg hover:bg-green-600">
                                    ${isEditing ? 'Salvar Alterações' : 'Adicionar Categoria'}
                                </button>
                                ${isEditing ? '<button type="button" id="cancel-edit-category-btn" class="w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600 mt-2">Cancelar Edição</button>' : ''}
                            </form>
                        </div>
                    </div>`;

                const renderCategories = () => {
                    const categoryManagementList = modal.querySelector('#category-management-list');
                    categoryManagementList.innerHTML = '';

                    Object.keys(settings.categorias).forEach(tipoId => {
                        const tipo = settings.tipos.find(t => t.id.toString() === tipoId);
                        if (!tipo) return;
                        const tipoLabel = tipo ? `${tipo.name} (${tipo.main})` : tipoId;
                        const isSystemType = ['Estorno'].includes(tipo.name);

                        const categorias = settings.categorias[tipoId] || [];
                        if (categorias.length === 0) return;

                        const categoriaItems = categorias.map(cat => `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span>${cat}</span>
                                ${!isSystemType ? `
                                <div class="flex gap-3">
                                    <button class="edit-category-btn text-gray-400 hover:text-blue-500" data-tipoid="${tipoId}" data-category="${cat}">
                                        <i class="fa-solid fa-pen-to-square"></i>
                                    </button>
                                    <button class="delete-category-btn text-gray-400 hover:text-red-500" data-tipoid="${tipoId}" data-category="${cat}">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>` : ''}
                            </div>
                        `).join('');

                        categoryManagementList.innerHTML += `
                            <div class="mb-4">
                                <h5 class="font-semibold text-gray-600 mb-1">${tipoLabel} ${isSystemType ? '<i class="fa-solid fa-lock fa-xs text-gray-400 ml-1" title="Tipo de sistema"></i>' : ''}</h5>
                                <div class="space-y-2 pl-2">${categoriaItems}</div>
                            </div>
                        `;
                    });
                };


                modal.querySelector('#add-category-form').onsubmit = (e) => {
                    e.preventDefault();
                    const form = e.target;
                    clearFormErrors(form);

                    const name = form.elements.name.value.trim();
                    const tipoId = form.elements.tipoId.value;
                    const originalName = form.elements.originalName.value.trim();
                    const originalTipoId = form.elements.originalTipoId.value;

                    if (!name) return showFormError(form, 'name', 'Nome inválido.');
                    if (!tipoId) return showFormError(form, 'tipoId', 'Tipo inválido.');

                    if (!settings.categorias[tipoId]) settings.categorias[tipoId] = [];

                    const alreadyExists = settings.categorias[tipoId].includes(name) && (name !== originalName || tipoId !== originalTipoId);

                    if (alreadyExists) {
                        showFormError(form, 'name', 'Categoria já existe.');
                        return;
                    }

                    if (isEditing) {
                        const isInUse = transactions.some(
                            t => t.categoria === originalName && t.tipoId.toString() === originalTipoId
                        );

                        if (isInUse) {
                            showFormError(form, 'name', 'Categoria em uso e não pode ser editada.');
                            return;
                        }

                        if (settings.categorias[originalTipoId]) {
                            settings.categorias[originalTipoId] = settings.categorias[originalTipoId].filter(c => c !== originalName);
                        }

                        if (!settings.categorias[tipoId].includes(name)) {
                            settings.categorias[tipoId].push(name);
                            settings.categorias[tipoId].sort();
                        }

                        saveSettings();
                        closeModal();
                        openCategoriesModal();
                    } else {
                        settings.categorias[tipoId].push(name);
                        settings.categorias[tipoId].sort();
                        saveSettings();
                        renderCategories();
                        form.reset();
                    }
                };

                modal.onclick = (e) => {
                    const deleteBtn = e.target.closest('.delete-category-btn');
                    const editBtn = e.target.closest('.edit-category-btn');
                    const cancelEditBtn = e.target.closest('#cancel-edit-category-btn');

                    if (cancelEditBtn) {
                        closeModal();
                        openCategoriesModal();
                    }

                    if (editBtn) {
                        const { tipoid, category } = editBtn.dataset;
                        closeModal();
                        openCategoriesModal({ name: category, tipoId: tipoid });
                    }

                    if (deleteBtn) {
                        const { tipoid, category } = deleteBtn.dataset;
                        const isInUse = transactions.some(
                            t => t.categoria === category && t.tipoId.toString() === tipoid
                        );
                        if (isInUse) {
                            showFormError(modal.querySelector('#add-category-form'), 'name', 'Categoria em uso.');
                            return;
                        }
                        settings.categorias[tipoid] = settings.categorias[tipoid].filter(c => c !== category);
                        saveSettings();
                        renderCategories();
                    }
                };

                renderCategories();
                openModal(modal);
            };


        const openCreditCardsModal = (cardToEdit = null) => {
            const isEditing = cardToEdit !== null;
            const modal = document.getElementById('creditCardsModal');
            modal.innerHTML = `
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-800">Gerenciar Cartões de Crédito</h3>
                        <button class="close-modal-btn text-gray-400 hover:text-gray-600"><i class="fa fa-times fa-lg"></i></button>
                    </div>
                    <div>
                        <h4 class="font-bold text-lg text-gray-700 mb-3 border-b pb-2">Meus Cartões</h4>
                        <div id="cards-list" class="space-y-2 mt-2 max-h-60 overflow-y-auto"></div>
                        <form id="add-card-form" class="mt-4 space-y-3 p-4 border rounded-lg bg-gray-50">
                             <input type="hidden" name="id" value="${isEditing ? cardToEdit.id : ''}">
                            <h5 class="font-semibold text-md text-gray-800">${isEditing ? 'Editar Cartão' : 'Adicionar Novo Cartão'}</h5>
                            <input type="text" name="name" placeholder="Nome do Cartão (Ex: Nubank)" class="w-full border rounded-lg p-2" required value="${isEditing ? cardToEdit.name : ''}">
                            <select name="bandeira" class="w-full border rounded-lg p-2 bg-white" required>
                                <option value="" disabled>Bandeira</option>
                                <option>Visa</option><option>Mastercard</option><option>Elo</option><option>American Express</option><option>Hipercard</option><option>Outra</option>
                            </select>
                            <input type="number" name="diaVencimento" placeholder="Dia do Vencimento" class="w-full border rounded-lg p-2" min="1" max="31" required value="${isEditing ? cardToEdit.diaVencimento : ''}">
                            <div class="flex items-center gap-4">
                                <div class="flex items-center"><input id="temAnuidade" name="temAnuidade" type="checkbox" class="h-4 w-4 rounded border-gray-300" ${isEditing && cardToEdit.temAnuidade ? 'checked' : ''}><label for="temAnuidade" class="ml-2 block text-sm font-medium text-gray-900">Possui Anuidade?</label></div>
                                <div id="anuidade-fields" class="flex-1 flex gap-2 ${isEditing && cardToEdit.temAnuidade ? '' : 'hidden'}">
                                    <input type="text" name="valorAnuidade" placeholder="Valor da Parcela" class="w-1/2 border rounded-lg p-2" value="${isEditing && cardToEdit.temAnuidade ? cardToEdit.valorAnuidade.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : ''}">
                                    <input type="number" name="parcelasAnuidade" placeholder="Vezes" class="w-1/2 border rounded-lg p-2" min="1" value="${isEditing && cardToEdit.temAnuidade ? cardToEdit.parcelasAnuidade : '1'}">
                                </div>
                            </div>
                            <button type="submit" class="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600">${isEditing ? 'Salvar Alterações' : 'Adicionar Cartão'}</button>
                            ${isEditing ? '<button type="button" id="cancel-edit-card-btn" class="w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600 mt-2">Cancelar Edição</button>' : ''}
                        </form>
                    </div>
                </div>`;

            if (isEditing) {
                modal.querySelector('[name="bandeira"]').value = cardToEdit.bandeira;
            } else {
                 modal.querySelector('[name="bandeira"]').selectedIndex = 0;
            }

            const anuidadeCheckbox = modal.querySelector('[name="temAnuidade"]');
            const anuidadeFields = modal.querySelector('#anuidade-fields');
            anuidadeCheckbox.onchange = (e) => {
                anuidadeFields.classList.toggle('hidden', !e.target.checked);
            };

            const renderCards = () => {
                const cardsList = modal.querySelector('#cards-list');
                cardsList.innerHTML = '';
                if (settings.cartoes.length === 0) {
                    cardsList.innerHTML = '<p class="text-gray-500 text-center">Nenhum cartão cadastrado.</p>';
                } else {
                    settings.cartoes.forEach(card => {
                        cardsList.innerHTML += `
                            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p class="font-semibold"><i class="fa-regular fa-credit-card mr-2"></i>${card.name} (${card.bandeira})</p>
                                    <p class="text-xs text-gray-500 ml-6">Vence dia: ${card.diaVencimento} | Anuidade: ${card.temAnuidade ? `${card.parcelasAnuidade}x de ${formatCurrency(card.valorAnuidade)}` : 'Não'}</p>
                                </div>
                                <div class="flex gap-3">
                                   <button class="edit-card-btn text-gray-400 hover:text-blue-500" data-id="${card.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                                   <button class="delete-card-btn text-gray-400 hover:text-red-500" data-id="${card.id}"><i class="fa-solid fa-trash-can"></i></button>
                                </div>
                            </div>`;
                    });
                }
            };

            const createAnnuityTransactions = async (card, valorAnuidade, parcelasAnuidade) => {
                const anuidadeTypeId = settings.tipos.find(t => t.name === 'Anuidade')?.id;
                if (!anuidadeTypeId) {
                    console.error("Tipo 'Anuidade' não encontrado.");
                    return;
                }
                const groupId = Date.now() + 1;
                const baseDate = new Date();
                baseDate.setDate(card.diaVencimento);
                const transactionsColRef = collection(db, 'users', currentUser.uid, 'transactions');

                for (let i = 0; i < parcelasAnuidade; i++) {
                    const installmentDate = new Date(baseDate);
                    installmentDate.setMonth(baseDate.getMonth() + i);
                    const anuidadeTransaction = {
                        descricao: `Anuidade ${card.name}`,
                        valor: valorAnuidade,
                        data: installmentDate.toISOString().split('T')[0],
                        tipoId: anuidadeTypeId,
                        categoria: 'Anuidade',
                        cartaoId: card.id,
                        groupId,
                        pago: false,
                        installments: { current: i + 1, total: parcelasAnuidade, totalValue: valorAnuidade * parcelasAnuidade }
                    };
                    const docRef = await addDoc(transactionsColRef, anuidadeTransaction);
                    transactions.push({ ...anuidadeTransaction, id: docRef.id });
                }
            };

            const deleteFutureAnnuityTransactions = async (card) => {
                const anuidadeTypeId = settings.tipos.find(t => t.name === 'Anuidade')?.id;
                if (!anuidadeTypeId) return;

                const futureAnnuityTransactions = transactions.filter(t =>
                    t.cartaoId === card.id &&
                    t.tipoId === anuidadeTypeId &&
                    t.descricao === `Anuidade ${card.name}` &&
                    !t.pago &&
                    new Date(t.data) >= new Date()
                );

                for (const t of futureAnnuityTransactions) {
                    await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', t.id));
                }
                transactions = transactions.filter(t => !futureAnnuityTransactions.some(del => del.id === t.id));
            };

            modal.querySelector('#add-card-form').onsubmit = async (e) => {
                e.preventDefault();
                const form = e.target;
                clearFormErrors(form);
                const formData = new FormData(form);
                const cardId = formData.get('id') ? parseInt(formData.get('id')) : null;
                const name = formData.get('name').trim();
                const temAnuidade = formData.get('temAnuidade') === 'on';
                const valorAnuidade = temAnuidade ? parseCurrency(formData.get('valorAnuidade')) : 0;
                const parcelasAnuidade = temAnuidade ? parseInt(formData.get('parcelasAnuidade')) || 1 : 0;

                const cardData = {
                    name,
                    bandeira: formData.get('bandeira'),
                    diaVencimento: parseInt(formData.get('diaVencimento')),
                    temAnuidade,
                    valorAnuidade,
                    parcelasAnuidade
                };

                if (cardId) {
                    const index = settings.cartoes.findIndex(c => c.id === cardId);
                    if (index > -1) {
                        const originalCard = settings.cartoes[index];
                        settings.cartoes[index] = { ...originalCard, ...cardData };

                        if (cardData.temAnuidade && !originalCard.temAnuidade) {
                            await createAnnuityTransactions(settings.cartoes[index], cardData.valorAnuidade, cardData.parcelasAnuidade);
                        }
                        else if (!cardData.temAnuidade && originalCard.temAnuidade) {
                            await deleteFutureAnnuityTransactions(originalCard);
                        }

                        await saveSettings();
                        updateUIForMonth();
                        closeModal();
                        openCreditCardsModal();
                    }
                } else {
                    if (name && !settings.cartoes.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                        const newCard = { id: Date.now(), ...cardData };
                        settings.cartoes.push(newCard);

                        if (temAnuidade && valorAnuidade > 0 && parcelasAnuidade > 0) {
                            await createAnnuityTransactions(newCard, valorAnuidade, parcelasAnuidade);
                        }
                        await saveSettings();
                        renderCards();
                        form.reset();
                        anuidadeFields.classList.add('hidden');
                        updateUIForMonth();
                    } else {
                        showFormError(form, 'name', 'Nome de cartão inválido ou já existe.');
                    }
                }
            };

            modal.onclick = (e) => {
                const deleteCardBtn = e.target.closest('.delete-card-btn');
                const editCardBtn = e.target.closest('.edit-card-btn');
                const cancelEditBtn = e.target.closest('#cancel-edit-card-btn');

                if (cancelEditBtn) {
                    closeModal();
                    openCreditCardsModal();
                }

                if (editCardBtn) {
                    const cardId = parseInt(editCardBtn.dataset.id);
                    const card = settings.cartoes.find(c => c.id === cardId);
                    if (card) {
                        closeModal();
                        openCreditCardsModal(card);
                    }
                }

                if (deleteCardBtn) {
                    const cardId = parseInt(deleteCardBtn.dataset.id);
                    if (transactions.some(t => t.cartaoId === cardId)) {
                        showFormError(modal.querySelector('#add-card-form'), 'name', 'Este cartão está em uso e não pode ser excluído.');
                        return;
                    }
                    settings.cartoes = settings.cartoes.filter(c => c.id !== cardId);
                    saveSettings();
                    renderCards();
                }
            };

            renderCards();
            openModal(modal);
        };

        const openReversalModal = (cardId) => {
            const modal = document.getElementById('reversalModal');
            const form = modal.querySelector('#reversal-form');
            form.reset();
            clearFormErrors(form);
            form.querySelector('[name="cardId"]').value = cardId;
            openModal(modal);
        };

        const openWhatsappModal = (message) => {
            whatsappShareData = message;
            const modal = document.getElementById('whatsappModal');
            openModal(modal);
        };

        const updateExpenseSortButtonsUI = () => {
            const buttons = expenseSortContainer.querySelectorAll('.expense-sort-btn');
            buttons.forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
                btn.classList.add('bg-white', 'text-gray-700', 'border', 'border-gray-300', 'hover:bg-gray-100');
                const icon = btn.querySelector('i');
                if (icon) { icon.remove(); }
            });

            const activeButton = expenseSortContainer.querySelector(`.expense-sort-btn[data-sort="${expenseSortState.key}"]`);
            if (activeButton) {
                activeButton.classList.add('bg-blue-600', 'text-white', 'shadow-md');
                activeButton.classList.remove('bg-white', 'text-gray-700', 'border', 'border-gray-300', 'hover:bg-gray-100');
                const icon = document.createElement('i');
                icon.className = `fa-solid ${expenseSortState.order === 'asc' ? 'fa-arrow-up-long' : 'fa-arrow-down-long'} ml-2`;
                activeButton.appendChild(icon);
            }
        };

        const renderFilterDropdown = () => {
            const statusContainer = document.getElementById('filter-status-options');
            const sourceContainer = document.getElementById('filter-source-options');

            statusContainer.innerHTML = '';
            sourceContainer.innerHTML = '';

            const statusOptions = [
                { value: 'todas', text: 'Todas' },
                { value: 'nao-pagas', text: 'Não Pagas' },
                { value: 'pagas', text: 'Pagas' },
                { value: 'vencidas', text: 'Vencidas' }
            ];

            statusOptions.forEach(opt => {
                const item = document.createElement('button');
                item.className = `filter-item w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${activeFilters.status === opt.value ? 'active' : ''}`;
                item.textContent = opt.text;
                item.dataset.type = 'status';
                item.dataset.value = opt.value;
                statusContainer.appendChild(item);
            });

            const sourceOptions = [
                { value: 'all', text: 'Todas as Fontes' },
                { value: 'geral', text: 'Contas Gerais' },
                ...settings.cartoes.map(card => ({ value: card.id, text: card.name }))
            ];

            sourceOptions.forEach(opt => {
                const item = document.createElement('button');
                item.className = `filter-item w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${String(activeFilters.cardId) === String(opt.value) ? 'active' : ''}`;
                item.textContent = opt.text;
                item.dataset.type = 'source';
                item.dataset.value = opt.value;
                sourceContainer.appendChild(item);
            });
        };

        const updateFilterBadge = () => {
            const badge = document.getElementById('filter-badge');
            let count = 0;
            if (activeFilters.status !== 'todas') {
                count++;
            }
            if (activeFilters.cardId !== 'all') {
                count++;
            }

            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        };

        function initializeAppUI() {
            document.getElementById('today-btn').ondblclick = recalculateAllThirdPartyCredits; 
            addTransactionBtn.onclick = () => openAddEditTransactionModal();
            prevMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); updateUIForMonth(); };
            nextMonthBtn.onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); updateUIForMonth(); };
            todayBtn.onclick = () => { currentDate = new Date(); updateUIForMonth(); };
            document.getElementById('simulationBtn').onclick = openSimulationModal;

             // NOVO: "Ouvinte" para o campo de pesquisa de despesas
            const expenseSearchInput = document.getElementById('expense-search-input');
            if (expenseSearchInput) {
                expenseSearchInput.addEventListener('input', () => {
                    expenseSearchTerm = expenseSearchInput.value.toLowerCase().trim();
                    updateUIForMonth(); // Atualiza a UI para refletir a pesquisa
                });
            }
            openReportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.add('-translate-x-full');
                window.location.href = 'projecao.html';
            });
            
            const addThirdPartyDebtShortcutBtn = document.getElementById('add-third-party-debt-shortcut-btn');
            if (addThirdPartyDebtShortcutBtn) {
                addThirdPartyDebtShortcutBtn.addEventListener('click', () => {
                    openAddEditThirdPartyDebtModal({});
                    setTimeout(() => {
                        const thirdPartyInput = document.getElementById('thirdParty');
                        const tipoSelect = document.getElementById('tipo');
                        if (thirdPartyInput && tipoSelect) {
                            const despesaOption = Array.from(tipoSelect.options).find(opt => {
                                const tipo = findTypeBy('id', opt.value);
                                return tipo && tipo.main === 'Despesa';
                            });
                            if (despesaOption) {
                                tipoSelect.value = despesaOption.value;
                                tipoSelect.dispatchEvent(new Event('change'));
                            }
                            thirdPartyInput.focus();
                        }
                    }, 150);
                });
            }

            const notificationBanner = document.getElementById('notification-banner');
            const closeNotificationBtn = document.getElementById('close-notification-btn');
            const notificationIcon = document.getElementById('notification-icon');
            const installmentStatusRadios = document.querySelectorAll('input[name="installmentStatus"]');
            const initialInstallmentWrapper = document.getElementById('initialInstallmentWrapper');

            installmentStatusRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'notFirst') {
                        initialInstallmentWrapper.classList.remove('hidden');
                    } else {
                        initialInstallmentWrapper.classList.add('hidden');
                    }
                });
            });

            if (closeNotificationBtn && notificationBanner && notificationIcon) {
                // Ação para o botão 'X' do banner
                closeNotificationBtn.addEventListener('click', () => {
                    notificationBanner.classList.add('hidden'); // Esconde o banner principal
                    notificationIcon.classList.remove('hidden'); // Mostra o ícone persistente
                });

                // Ação para o clique no ícone persistente
                notificationIcon.addEventListener('click', () => {
                    notificationIcon.classList.add('hidden'); // Esconde o ícone
                    notificationBanner.classList.remove('hidden'); // Mostra o banner principal novamente
                });
            }
            // --- FIM DA LÓGICA ATUALIZADA ---

            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('main-content');
            const collapseBtn = document.getElementById('collapse-sidebar-btn');
            const openMobileBtn = document.getElementById('open-sidebar-mobile-btn');
            const closeMobileBtn = document.getElementById('close-sidebar-mobile-btn');

            collapseBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                sidebar.classList.toggle('w-64');
                sidebar.classList.toggle('w-20');
                mainContent.classList.toggle('md:pl-64');
                mainContent.classList.toggle('md:pl-20');
            });
            openMobileBtn.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
            closeMobileBtn.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));

            document.getElementById('openDashboardLink').onclick = (e) => {
                e.preventDefault();
                sidebar.classList.add('-translate-x-full');
            };

            openCadastroHubBtn.onclick = (e) => {
                e.preventDefault();
                sidebar.classList.add('-translate-x-full');
                const modal = document.getElementById('settingsHubModal');
                modal.innerHTML = `<div class="p-6"><div class="flex justify-between items-center mb-6"><h2 class="text-xl font-semibold">Cadastros Gerais</h2><button class="close-modal-btn text-gray-400 hover:text-gray-600"><i class="fa fa-times fa-lg"></i></button></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="settings-card cursor-pointer bg-gray-100 hover:bg-gray-200 p-4 rounded-lg text-center transition-all" id="open-types-btn"><i class="fa-solid fa-tags text-3xl mb-2 mx-auto text-blue-500"></i><p class="text-sm font-medium">Gerenciar Tipos</p></div><div class="settings-card cursor-pointer bg-gray-100 hover:bg-gray-200 p-4 rounded-lg text-center transition-all" id="open-categories-btn"><i class="fa-solid fa-sitemap text-3xl mb-2 mx-auto text-indigo-500"></i><p class="text-sm font-medium">Gerenciar Categorias</p></div><div class="settings-card cursor-pointer bg-gray-100 hover:bg-gray-200 p-4 rounded-lg text-center transition-all" id="open-credit-cards-btn"><i class="fa-solid fa-credit-card text-3xl mb-2 mx-auto text-green-500"></i><p class="text-sm font-medium">Cartões de Crédito</p></div><div class="settings-card cursor-pointer bg-gray-100 hover:bg-gray-200 p-4 rounded-lg text-center transition-all" id="open-orcamentos-btn"><i class="fa-solid fa-bullseye text-3xl mb-2 mx-auto text-yellow-500"></i><p class="text-sm font-medium">Gerir Orçamentos</p></div></div></div>`;
                modal.querySelector('#open-types-btn').onclick = () => { closeModal(); openTypesModal(); };
                modal.querySelector('#open-categories-btn').onclick = () => { closeModal(); openCategoriesModal(); };
                modal.querySelector('#open-credit-cards-btn').onclick = () => { closeModal(); openCreditCardsModal(); };
                modal.querySelector('#open-orcamentos-btn').onclick = () => { closeModal(); openOrcamentosModal(); };
                openModal(modal);
            };

            openReportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.add('-translate-x-full');
                window.location.href = 'reports.html';
            });       
            
            // openReportBtn.addEventListener('click', (e) => {
            //     e.preventDefault();
            //     sidebar.classList.add('-translate-x-full');
            //     window.location.href = 'projecao.html';
            // });
            
            const terceirosContainer = document.getElementById('terceiros-view-content');
            if (terceirosContainer) {
                terceirosContainer.addEventListener('click', async (e) => {
                    const addDebtBtn = e.target.closest('.add-third-party-debt-btn');
                    if (addDebtBtn) {
                        e.stopPropagation();
                        const personName = addDebtBtn.dataset.personName;
                        openAddEditThirdPartyDebtModal({ personName: personName });
                        return;
                    }
                    const card = e.target.closest('.bg-white');
                    if (!card) return;
            
                    // Ações no Cabeçalho do Card
                    if (e.target.closest('.share-summary-btn') || e.target.closest('.register-payment-btn') || e.target.closest('.apply-credit-btn')) {
                        e.stopPropagation();
                    }
                    if (e.target.closest('.share-summary-btn')) {
                        const personName = e.target.closest('.share-summary-btn').dataset.personName;
            
                        const monthTransactions = getTransactionsForMonth(currentDate);
                        const personTransactions = monthTransactions.filter(t => t.thirdParty === personName);
            
                        if (personTransactions.length === 0) {
                            openGenericConfirmModal({ title: 'Sem Lançamentos', message: `Não há lançamentos para ${personName} neste mês.`, confirmText: 'Ok' });
                            return;
                        }
            
                        let msg = `*Resumo de Dívidas - ${personName}*\n*${currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}*\n\n`;
                        
                        const debts = personTransactions.filter(t => !t.isCreditRecord);
                        const credits = personTransactions.filter(t => t.isCreditRecord);
            
                        // --- LÓGICA DE CÁLCULO ATUALIZADA ---
                        const totalDebtsMonth = debts.reduce((sum, t) => sum + t.valor, 0);
                        
                        const totalPendingMonth = debts
                            .filter(t => !t.thirdPartyPaid)
                            .reduce((sum, t) => sum + t.valor, 0);
            
                        const personGlobalCredit = settings.thirdPartyCredits[personName] || 0;
                        
                        const finalBalance = totalPendingMonth - personGlobalCredit;
                        // --- FIM DA LÓGICA DE CÁLCULO ATUALIZADA ---
            
                        // if (debts.length > 0) {
                        //     msg += '*Dívidas do Mês:*\n';
                            
                        //     // Ordena as dívidas por data antes de exibi-las
                        //     debts.sort((a, b) => new Date(a.data) - new Date(b.data));
                        
                        //     debts.forEach(t => {
                        //         let desc = t.descricao;
                        //         if (t.installments) desc += ` (${t.installments.current}/${t.installments.total})`;
                        
                        //         // Adiciona a data formatada (DD/MM) no início da linha
                        //         const date = new Date(t.data + 'T00:00:00');
                        //         const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                                
                        //         // Linha da mensagem com a data incluída
                        //         msg += `• ${formattedDate} - ${t.thirdPartyPaid ? '_(quitado)_ ' : ''}${desc}: ${formatCurrencyForShare(t.valor)}\n`;
                        //     });
                        // }                        
                        

                        if (debts.length > 0) {
                            msg += '*Dívidas do Mês:*\n';
                            
                            debts.sort((a, b) => new Date(a.data) - new Date(b.data));

                            debts.forEach(t => {
                                let desc = t.descricao;
                                if (t.installments) desc += ` (${t.installments.current}/${t.installments.total})`;

                                const date = new Date(t.data + 'T00:00:00');
                                const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                                
                                if (t.thirdPartyPaid) {
                                    msg += `• ${formattedDate} - ~${t.thirdPartyPaid ? '_(quitado)_ ' : ''}${desc}: ${formatCurrencyForShare(t.valor)}~\n`;

                                } else {
                                    msg += `• ${formattedDate} - ${desc}: ${formatCurrencyForShare(t.valor)}\n`;
                                }
                            });
                        }  

                        if (credits.length > 0) {
                            msg += `\n*Créditos Recebidos no Mês:*\n`;
                            credits.forEach(t => {
                                msg += `• ${t.descricao}: ${formatCurrencyForShare(t.valor)}\n`;
                            });
                        }
            
                        // --- MENSAGEM FINAL ATUALIZADA PARA MAIOR CLAREZA ---
                        msg += `\n*Total de Dívidas no Mês: ${formatCurrencyForShare(totalDebtsMonth)}*`;
                        msg += `\n*Pendente no Mês: ${formatCurrencyForShare(totalPendingMonth)}*`;
                        
                        if (personGlobalCredit > 0) {
                             msg += `\n*Crédito Disponível (Geral): ${formatCurrencyForShare(personGlobalCredit)}*`;
                        }
                        
                        msg += `\n\n*Saldo Final a Pagar (Pendente - Crédito): ${formatCurrencyForShare(finalBalance)}*`;
            
                        openWhatsappModal(msg);
                        return; 
                    }
                    if (e.target.closest('.register-payment-btn')) {
                        const personName = e.target.closest('.register-payment-btn').dataset.personName;
                        openRegisterThirdPartyPaymentModal(personName);
                        return;
                    }
                    if (e.target.closest('.apply-credit-btn')) {
                        const personName = e.target.closest('.apply-credit-btn').dataset.personName;
                        openApplyCreditModal(personName);
                        return;
                    }
                    if (e.target.closest('.details-toggle-btn')) {
                        card.querySelector('.third-party-details')?.classList.toggle('hidden');
                        card.querySelector('.details-chevron')?.classList.toggle('rotate-180');
                    }
                    
                    // Ações no Conteúdo Detalhado
                    const detailsSection = e.target.closest('.third-party-details');
                    if (detailsSection) {
                        // Lógica das abas
                        if (e.target.closest('.third-party-tab-btn')) {
                            const tabButton = e.target.closest('.third-party-tab-btn');
                            const tabId = tabButton.dataset.tabId;
                            
                            detailsSection.querySelectorAll('.third-party-tab-btn').forEach(btn => {
                                btn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
                                btn.classList.add('text-gray-500');
                            });
                            
                            tabButton.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
                            tabButton.classList.remove('text-gray-500');
                            
                            detailsSection.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
                            detailsSection.querySelector(`[data-tab-content-id="${tabId}"]`)?.classList.remove('hidden');
                        }
            
                        // --- INÍCIO DA LÓGICA PARA BOTÕES DE CRÉDITO ---
                        const editCreditBtn = e.target.closest('.edit-credit-btn');
                        if (editCreditBtn) {
                            const transactionId = editCreditBtn.dataset.id;
                            const transaction = transactions.find(t => t.id === transactionId);
                            if (transaction) {
                                const personCredit = settings.thirdPartyCredits[transaction.thirdParty] || 0;
                                const originalCreditValue = transaction.valor;

                                // VALIDAÇÃO MOVIDA PARA O CLIQUE:
                                // Se o crédito disponível atualmente for menor que o valor original deste registro,
                                // significa que o crédito já começou a ser usado.
                                if (personCredit < originalCreditValue) {
                                    openGenericConfirmModal({
                                        title: 'Ação Inválida',
                                        message: `Este registro de crédito não pode ser editado, pois parte do crédito de ${transaction.thirdParty} já foi utilizado.`,
                                        confirmText: 'Entendi',
                                        iconClass: 'fa-solid fa-ban text-red-500',
                                        hideCancelButton: true // <-- Oculta o botão "Cancelar"
                                        // Não é mais necessário passar 'onConfirm: closeModal'
                                    });
                                    return; // Impede a abertura do modal de edição
                                }

                                // Se a validação passar, o modal é aberto normalmente.
                                openEditCreditModal(transaction);
                            }
                        }
            
                        const deleteCreditBtn = e.target.closest('.delete-credit-btn');
                        if (deleteCreditBtn) {
                            const transactionId = deleteCreditBtn.dataset.id;
                            const transaction = transactions.find(t => t.id === transactionId);
                            if (transaction) {
                                const personCredit = settings.thirdPartyCredits[transaction.thirdParty] || 0;
                                if (personCredit < transaction.valor) {
                                    openGenericConfirmModal({
                                        title: 'Ação Inválida',
                                        message: 'Este crédito não pode ser excluído, pois parte dele já foi utilizado e a exclusão resultaria em um saldo de crédito negativo.',
                                        confirmText: 'Entendi',
                                        iconClass: 'fa-solid fa-ban text-red-500',
                                        hideCancelButton: true
                                    });
                                    return;
                                }
            
                                openGenericConfirmModal({
                                    title: 'Excluir Crédito',
                                    message: `Tem certeza que deseja excluir o registro de crédito de <strong>${formatCurrency(transaction.valor)}</strong>? O valor será abatido do saldo de crédito geral de ${transaction.thirdParty}.`,
                                    confirmText: 'Excluir',
                                    confirmClass: 'bg-red-600 hover:bg-red-700',
                                    onConfirm: async () => {
                                        settings.thirdPartyCredits[transaction.thirdParty] -= transaction.valor;
                                        await saveSettings();
                                        
                                        await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', transactionId));
                                        transactions = transactions.filter(t => t.id !== transactionId);
            
                                        closeModal();
                                        updateUIForMonth();
                                    }
                                });
                            }
                        }
                        // --- FIM DA LÓGICA DOS BOTÕES DE CRÉDITO ---
            
                        // Lógica para Dívidas
                        if (e.target.closest('.edit-debt-btn')) {
                            const debtId = e.target.closest('.edit-debt-btn').dataset.debtId;
                            const debtTransaction = transactions.find(t => t.id === debtId);
                            if (debtTransaction) openAddEditThirdPartyDebtModal(debtTransaction); 
                        }
                        if (e.target.closest('.delete-debt-btn')) {
                            const debtId = e.target.closest('.delete-debt-btn').dataset.debtId;
                            const debtTransaction = transactions.find(t => t.id === debtId);
                            if (debtTransaction) openDeleteConfirmationModal(debtTransaction);
                        }
                        const quitCheckbox = e.target.closest('.quit-third-party-debt-check');
                        if (quitCheckbox) {
                            const debtId = quitCheckbox.dataset.debtId;
                            const isPaid = quitCheckbox.checked;
                            const transaction = transactions.find(t => t.id === debtId);
                            if (transaction) {
                                transaction.thirdPartyPaid = isPaid;
                                await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', debtId), { thirdPartyPaid: isPaid });
                                renderThirdPartyView();
                            }
                        }
                    }
                });
            }

            const handleTransactionClick = async (e) => {
                const editButton = e.target.closest('.edit-btn');
                const deleteButton = e.target.closest('.delete-btn');
                const quitButton = e.target.closest('.quit-btn');
                const checkbox = e.target.closest('.select-transaction-checkbox');

                if (checkbox) {
                    const id = checkbox.dataset.id;
                    if (checkbox.checked) { if (!selectedTransactionIds.includes(id)) selectedTransactionIds.push(id); }
                    else { selectedTransactionIds = selectedTransactionIds.filter(i => i !== id); }
                    updateBulkActionsUI();
                }
                if (quitButton) {
                    const id = quitButton.dataset.id;
                    const transaction = transactions.find(t => t.id === id);
                    if (transaction) {
                        transaction.pago = !transaction.pago;
                        await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', id), { pago: transaction.pago });
                        updateUIForMonth();
                    }
                }
                if (editButton) {
                    const id = editButton.dataset.id;
                    const transaction = transactions.find(t => t.id === id);
                    if (transaction) openAddEditTransactionModal(transaction);
                }
                if (deleteButton) {
                    const id = deleteButton.dataset.id;
                    const transaction = transactions.find(t => t.id === id);
                    if (transaction) openDeleteConfirmationModal(transaction);
                }
            };

            tabContentLancamentos.addEventListener('click', handleTransactionClick);

            faturasViewContent.addEventListener('click', async (e) => {
                const quitGroupBtn = e.target.closest('.quit-group-btn'),
                      sortBtn = e.target.closest('.sort-btn'),
                      toggleListBtn = e.target.closest('.toggle-list-btn'),
                      whatsappBtn = e.target.closest('.whatsapp-share-btn'),
                      reversalBtn = e.target.closest('.reversal-btn'),
                      editBtn = e.target.closest('.edit-invoice-item-btn'),
                      deleteBtn = e.target.closest('.delete-invoice-item-btn'),
                      quickQuitBtn = e.target.closest('.quick-quit-btn');

                if (quickQuitBtn) {
                    const id = quickQuitBtn.dataset.id;
                    const transaction = transactions.find(t => t.id === id);
                    if (transaction) {
                        transaction.pago = true;
                        await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', id), { pago: true });
                        updateUIForMonth();
                    }
                    return;
                }
                if (editBtn) { const id = editBtn.dataset.id; const t = transactions.find(tr => tr.id === id); if(t) openAddEditTransactionModal(t); return; }
                if (deleteBtn) { const id = deleteBtn.dataset.id; const t = transactions.find(tr => tr.id === id); if(t) openDeleteConfirmationModal(t); return; }
                if (reversalBtn) { const id = reversalBtn.dataset.cardId; const card = settings.cartoes.find(c => c.id == id); openGenericConfirmModal({ title: 'Lançar Estorno', message: `Você deseja lançar um novo estorno (crédito) na fatura do cartão <strong>${card.name}</strong>?`, onConfirm: () => { closeModal(); openReversalModal(id); }, confirmText: 'Lançar', iconClass: 'fa-solid fa-receipt text-indigo-500' }); return; }
                if (toggleListBtn) { const list = toggleListBtn.parentElement.querySelector('.invoice-list'); list.classList.toggle('expanded'); toggleListBtn.textContent = list.classList.contains('expanded') ? 'Ver menos' : 'Ver mais'; }
                if(sortBtn) { invoiceSortState[sortBtn.dataset.groupKey] = sortBtn.dataset.sort; renderInvoicesView(getTransactionsForMonth(currentDate)); }
                if (whatsappBtn) {
                    const { groupType, id, subtitle } = whatsappBtn.dataset; const monthTrans = getTransactionsForMonth(currentDate); let toShare = []; let title = '';
                    if (groupType === 'card') { const card = settings.cartoes.find(c => c.id == id); title = `Fatura ${card.name}`; toShare = monthTrans.filter(t => t.cartaoId == id); }
                    else if (groupType === 'general') { title = 'Despesas Gerais'; toShare = monthTrans.filter(t => !t.cartaoId && findTypeBy('id', t.tipoId)?.main === 'Despesa'); }
                    if (toShare.length > 0) {
                        let msg = `*${title}*\n_${subtitle}_\n\n`; let total = 0;
                        toShare.forEach(t => {
                            const isEstorno = findTypeBy('id', t.tipoId)?.main === 'Estorno';
                            let desc = t.descricao;
                            if (t.installments) { desc += ` (${t.installments.current}/${t.installments.total})`; }
                            msg += `${desc}: ${isEstorno ? '+' : ''}${formatCurrencyForShare(t.valor)}\n`;
                            total += isEstorno ? -t.valor : t.valor;
                        });
                        msg += `\n*Total: ${formatCurrencyForShare(total)}*`;
                        openWhatsappModal(msg);
                    }
                }
                if (quitGroupBtn) {
                    const { groupType, id } = quitGroupBtn.dataset; const monthTrans = getTransactionsForMonth(currentDate); let toToggle = [];
                    if (groupType === 'card') { toToggle = monthTrans.filter(t => t.cartaoId == id); }
                    else if (groupType === 'general') { toToggle = monthTrans.filter(t => !t.cartaoId && findTypeBy('id', t.tipoId)?.main === 'Despesa'); }
                    if (toToggle.length > 0) { const allPaid = toToggle.every(t => t.pago); for (const t of toToggle) { const gT = transactions.find(gt => gt.id === t.id); if(gT) { gT.pago = !allPaid; await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', t.id), { pago: !allPaid }); } } updateUIForMonth(); }
                }
            });

            const filterBtn = document.getElementById('filter-btn');
            const filterDropdown = document.getElementById('filter-dropdown');

            filterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = filterDropdown.classList.contains('hidden');
                if (isHidden) {
                    renderFilterDropdown();
                    filterDropdown.classList.remove('hidden');
                    setTimeout(() => {
                        filterDropdown.classList.remove('opacity-0', 'scale-95');
                    }, 10);
                } else {
                    filterDropdown.classList.add('opacity-0', 'scale-95');
                    setTimeout(() => {
                        filterDropdown.classList.add('hidden');
                    }, 200);
                }
            });

            filterDropdown.addEventListener('click', (e) => {
                const filterItem = e.target.closest('.filter-item');
                if (filterItem) {
                    const type = filterItem.dataset.type;
                    const value = filterItem.dataset.value;

                    if (type === 'status') {
                        activeFilters.status = value;
                    } else if (type === 'source') {
                        activeFilters.cardId = value;
                    }

                    updateFilterBadge();
                    updateUIForMonth();

                    filterDropdown.classList.add('opacity-0', 'scale-95');
                    setTimeout(() => filterDropdown.classList.add('hidden'), 200);
                }
            });

            document.addEventListener('click', (e) => {
                if (!filterContainer.contains(e.target) && !filterDropdown.classList.contains('hidden')) {
                    filterDropdown.classList.add('opacity-0', 'scale-95');
                    setTimeout(() => filterDropdown.classList.add('hidden'), 200);
                }
            });


            expenseSortContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.expense-sort-btn');
                if (btn) {
                    const key = btn.dataset.sort;
                    if (expenseSortState.key === key) { expenseSortState.order = expenseSortState.order === 'asc' ? 'desc' : 'asc'; }
                    else { expenseSortState.key = key; expenseSortState.order = 'asc'; }
                    updateExpenseSortButtonsUI(); updateUIForMonth();
                }
            });

            selectAllExpensesCheckbox.addEventListener('change', (e) => {
                const expenseTableBody = document.getElementById('expense-table-body'); if (!expenseTableBody) return;
                const checkboxes = expenseTableBody.querySelectorAll('.select-transaction-checkbox');
                selectedTransactionIds = []; const isChecked = e.target.checked;
                checkboxes.forEach(cb => {
                    const id = cb.dataset.id; const t = transactions.find(tr => tr.id === id);
                    if (isChecked && t && !t.pago) { cb.checked = true; selectedTransactionIds.push(id); }
                    else { cb.checked = false; }
                });
                updateBulkActionsUI();
            });

            quitOpenBtn.onclick = () => {
                const toQuit = selectedTransactionIds.map(id => transactions.find(t => t.id === id)).filter(t => t && !t.pago);
                openGenericConfirmModal({ title: 'Quitar Transações', message: `Você tem certeza que deseja quitar ${toQuit.length} transações em aberto?`,
                    onConfirm: async () => {
                        for (const t of toQuit) { t.pago = true; await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', t.id), { pago: true }); }
                        updateUIForMonth(); closeModal();
                    },
                    confirmText: 'Quitar', confirmClass: 'bg-green-600 hover:bg-green-700', iconClass: 'fa-solid fa-check-double text-green-500'
                });
            };

            reversePaidBtn.onclick = () => {
                const toReverse = selectedTransactionIds.map(id => transactions.find(t => t.id === id)).filter(t => t && t.pago && findTypeBy('id', t.tipoId)?.main !== 'Estorno');
                openGenericConfirmModal({ title: 'Estornar Transações', message: `Você tem certeza que deseja estornar ${toReverse.length} transações pagas? Um novo lançamento de crédito será criado para cada uma.`,
                    onConfirm: async () => {
                        const estornoTypeId = settings.tipos.find(t => t.main === 'Estorno')?.id; if (!estornoTypeId) return;
                        const colRef = collection(db, 'users', currentUser.uid, 'transactions');
                        for (const t of toReverse) {
                             const reversalData = { descricao: `Estorno de: ${t.descricao}`, valor: t.valor, data: new Date().toISOString().split('T')[0], tipoId: estornoTypeId, categoria: 'Estorno Cartão', cartaoId: t.cartaoId, pago: true };
                             const docRef = await addDoc(colRef, reversalData);
                             transactions.push({ ...reversalData, id: docRef.id });
                        }
                        updateUIForMonth(); closeModal();
                    },
                    confirmText: 'Estornar', confirmClass: 'bg-orange-500 hover:bg-orange-600', iconClass: 'fa-solid fa-receipt text-orange-500'
                });
            };

            document.getElementById('reversal-form').addEventListener('submit', async (e) => {
                e.preventDefault(); const form = e.target; clearFormErrors(form); const valorNum = parseCurrency(form.valor.value);
                if (isNaN(valorNum) || valorNum <= 0) { showFormError(form, 'valor', 'Valor inválido.'); return; }
                const estornoTypeId = settings.tipos.find(t => t.main === 'Estorno')?.id; if (!estornoTypeId) return;
                const data = { descricao: form.descricao.value, valor: valorNum, data: currentDate.toISOString().split('T')[0], tipoId: estornoTypeId, categoria: 'Estorno Cartão', cartaoId: parseInt(form.cardId.value), pago: true };
                const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), data);
                transactions.push({ ...data, id: docRef.id });
                updateUIForMonth(); closeModal();
            });


            tabLancamentos.onclick = () => switchTab('lancamentos');
            tabFaturas.onclick = () => switchTab('faturas');
            tabTerceiros.onclick = () => {
                switchTab('terceiros');
                renderThirdPartyView();
            };

            document.getElementById('whatsapp-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const phone = document.getElementById('whatsapp-phone').value.replace(/\D/g, '');
                if (phone && whatsappShareData) {
                    const encodedText = encodeURIComponent(whatsappShareData);
                    const isMobile = /Mobi/i.test(navigator.userAgent);
                    
                    const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
                    const url = `${baseUrl}?phone=${phone}&text=${encodedText}`;
                    
                    window.open(url, '_blank');
                    
                    closeModal();
                    document.getElementById('whatsapp-phone').value = '';
                }
            });


            document.querySelectorAll('.toggle-collapse-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const content = document.getElementById(button.dataset.target); const icon = button.querySelector('i');
                    content.classList.toggle('collapsed'); icon.classList.toggle('fa-chevron-up'); icon.classList.toggle('fa-chevron-down');
                });
            });

            document.getElementById('share-unpaid-btn').addEventListener('click', () => {
                const unpaid = getTransactionsForMonth(currentDate).filter(t => !t.thirdParty).filter(t => { const tipo = findTypeBy('id', t.tipoId); return (tipo?.main === 'Despesa' || tipo?.main === 'Investimento') && !t.pago; });
                if (unpaid.length === 0) {
                    const modal = openGenericConfirmModal({ title: 'Tudo em dia!', message: 'Você não possui despesas em aberto para este mês.', confirmText: 'Ok', iconClass: 'fa-solid fa-check-circle text-green-500' });
                    modal.querySelector('#generic-cancel-btn').style.display = 'none'; modal.querySelector('#generic-confirm-btn').onclick = closeModal;
                    return;
                }
                let msg = `*Despesas em Aberto - ${currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}*\n\n`; let total = 0;
                unpaid.sort((a,b) => new Date(a.data) - new Date(b.data)).forEach(t => {
                    msg += `${new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')} - ${t.descricao}: ${formatCurrencyForShare(t.valor)}\n`; total += t.valor;
                });
                msg += `\n*Total a Pagar: ${formatCurrencyForShare(total)}*`;
                openWhatsappModal(msg);
            });

            updateUIForMonth();
            updateExpenseSortButtonsUI();
            updateFilterBadge();
            document.body.addEventListener('click', (e) => { if (e.target.closest('.close-modal-btn')) closeModal(); });
            modalBackdrop.onclick = closeModal;
        }

        
        async function setupAndListen() {
            if (!auth) {
                console.error("Firebase Auth não foi inicializado.");
                loadingContainer.style.display = 'none';
                authContainer.style.display = 'flex';
                return;
            }
            try {
                await setPersistence(auth, browserLocalPersistence);
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        currentUser = user;
                        try {
                            if (user.email) {
                                const sidebarUserDisplay = document.getElementById('user-name-display-sidebar');
                                if (sidebarUserDisplay) {
                                    sidebarUserDisplay.textContent = user.email;
                                }
                            }
                            await loadUserData();
                            initializeAppUI();
                            appWrapper.classList.remove('hidden');
                            mainAppContainer.style.display = 'block';
                            authContainer.style.display = 'none';
                        } catch (error) {
                            console.error("Falha ao carregar dados do usuário:", error);
                            loginErrorEl.textContent = "Não foi possível carregar seus dados. Tente novamente.";
                            signOut(auth);
                        }
                    } else {
                        currentUser = null;
                        settings = {};
                        transactions = [];
                        appWrapper.classList.add('hidden');
                        mainAppContainer.style.display = 'none';
                        authContainer.style.display = 'flex';
                    }
                    loadingContainer.style.display = 'none';
                });
            } catch (error) {
                console.error("Erro ao definir persistência ou listener de autenticação:", error);
                loadingContainer.style.display = 'none';
                authContainer.style.display = 'flex';
            }
        }

        function main() {
            const savedEnv = localStorage.getItem('firebaseEnv') || 'prd';
            try {
                const services = initFirebase(savedEnv);
                auth = services.auth;
                db = services.db;
            } catch (error) {
                console.error("Falha ao inicializar o Firebase:", error);
                loadingContainer.style.display = 'none';
                authContainer.innerHTML = '<p class="text-red-500">Erro ao inicializar o ambiente do aplicativo.</p>';
                authContainer.style.display = 'flex';
                return;
            }
            document.querySelector(`input[name="firebase-env"][value="${savedEnv}"]`).checked = true;
            envRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const newEnv = e.target.value;
                    // if (auth && auth.currentUser) {
                    //     signOut(auth).then(() => {
                    //         localStorage.setItem('firebaseEnv', newEnv);
                    //         window.location.reload();
                    //     });
                    // } else {
                    //     localStorage.setItem('firebaseEnv', newEnv);
                    //     window.location.reload();
                    // }
                    localStorage.setItem('firebaseEnv', newEnv);
                    signOut(auth).finally(() => {
                        window.location.reload();
                    });
                });
            });
            setupAndListen();
        }

        const switchTab = (activeTab) => {
            ['lancamentos', 'faturas', 'terceiros'].forEach(tab => {
                const btn = document.getElementById(`tab-${tab}`);
                const content = document.getElementById(`tab-content-${tab}`);
                if(btn && content) {
                    btn.classList.toggle('tab-active', tab === activeTab);
                    btn.classList.toggle('tab-inactive', tab !== activeTab);
                    content.classList.toggle('hidden', tab !== activeTab);
                }
            });
            btnAgrupar.classList.toggle('hidden', activeTab !== 'faturas');
        };

        function openOrcamentosModal() {
            const modal = document.getElementById('orcamentosModal');
            let allCategories = [];
            settings.tipos.forEach(tipo => {
                if (tipo.main === 'Despesa' || tipo.main === 'Investimento') {
                    if (settings.categorias[tipo.id]) {
                        allCategories = [...allCategories, ...settings.categorias[tipo.id]];
                    }
                }
            });
            const uniqueCategories = [...new Set(allCategories)].sort();

            const categoryInputs = uniqueCategories.map(cat => {
                const orcamentoValor = settings.orcamentos[cat];
                const valorFormatado = orcamentoValor ? formatCurrencyInput(String(orcamentoValor * 100)) : '';
                return `
                <div class="flex items-center justify-between gap-4">
                    <label for="orcamento-${cat}" class="font-medium text-gray-700">${cat}</label>
                    <input type="text" name="${cat}" id="orcamento-${cat}" value="${valorFormatado}" placeholder="R$ 0,00"
                           class="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                           oninput="this.value = formatCurrencyInput(this.value)">
                </div>`;
            }).join('');

            modal.innerHTML = `
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-800">Gerir Orçamentos Mensais</h3>
                        <button class="close-modal-btn text-gray-400 hover:text-gray-600"><i class="fa fa-times fa-lg"></i></button>
                    </div>
                    <form id="orcamentos-form">
                        <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
                            ${categoryInputs || '<p class="text-center text-gray-500">Nenhuma categoria de despesa ou investimento encontrada.</p>'}
                        </div>
                        <div class="flex justify-end mt-6">
                            <button type="submit" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Guardar Orçamentos</button>
                        </div>
                    </form>
                </div>`;

            modal.querySelector('#orcamentos-form').onsubmit = (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newOrcamentos = {};
                for (let [category, value] of formData.entries()) {
                    const parsedValue = parseCurrency(value);
                    if (!isNaN(parsedValue) && parsedValue > 0) {
                        newOrcamentos[category] = parsedValue;
                    }
                }
                settings.orcamentos = newOrcamentos;
                saveSettings();
                closeModal();
                updateUIForMonth();
            };

            openModal(modal);
        }

        function renderOrcamentosSummary(monthTransactions) {
            const container = document.getElementById('orcamentos-summary-container');
            container.innerHTML = '';

            const orcamentosDefinidos = Object.keys(settings.orcamentos || {});
            if (orcamentosDefinidos.length === 0) {
                container.style.display = 'none';
                return;
            }

            container.style.display = 'block';
            let summaryHTML = '<h3 class="text-lg font-semibold text-gray-700 mb-4 px-2"><i class="fa-solid fa-bullseye mr-2"></i>Resumo dos Orçamentos</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

            orcamentosDefinidos.sort().forEach(categoria => {
                const orcamentoValor = settings.orcamentos[categoria];
                const gastoTotal = monthTransactions
                    .filter(t => t.categoria === categoria && (findTypeBy('id', t.tipoId)?.main === 'Despesa' || findTypeBy('id', t.tipoId)?.main === 'Investimento'))
                    .reduce((sum, t) => sum + t.valor, 0);

                const percentagem = (gastoTotal / orcamentoValor) * 100;

                let corBarra = 'bg-blue-600';
                if (percentagem > 100) {
                    corBarra = 'bg-red-600';
                } else if (percentagem >= 80) {
                    corBarra = 'bg-orange-500';
                }

                summaryHTML += `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-medium text-gray-800">${categoria}</span>
                            <span class="text-sm font-semibold ${percentagem > 100 ? 'text-red-600' : 'text-gray-600'}">${formatCurrency(gastoTotal)} / ${formatCurrency(orcamentoValor)}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div class="${corBarra} h-2.5 rounded-full" style="width: ${Math.min(percentagem, 100)}%"></div>
                        </div>
                    </div>
                `;
            });

            summaryHTML += '</div>';
            container.innerHTML = summaryHTML;
        }


        function checkForOverdueBills() {
            // 1. Pega os elementos da UI uma vez.
            const banner = document.getElementById('notification-banner');
            const messageEl = document.getElementById('notification-message');
            const actionBtn = document.getElementById('notification-action-btn');
            const icon = document.getElementById('notification-icon');
            const iconBadge = document.getElementById('notification-icon-badge');

            // 2. Busca em TODAS as transações, não apenas as do mês.
            const allOverdue = transactions.filter(t => {
                const tipo = findTypeBy('id', t.tipoId);
                if (!tipo || (tipo.main !== 'Despesa' && tipo.main !== 'Investimento')) {
                    return false;
                }
                const dueDate = new Date(t.data + 'T00:00:00');
                return !t.pago && dueDate < today;
            });

            if (allOverdue.length > 0) {
                // 3. Se existem contas vencidas, prepara a mensagem e os botões.
                const groups = {};
                allOverdue.forEach(t => {
                    const card = t.cartaoId ? settings.cartoes.find(c => c.id === t.cartaoId) : null;
                    const key = card ? `Fatura ${card.name}` : 'Contas Gerais';
                    if (!groups[key]) {
                        groups[key] = 0;
                    }
                    groups[key]++;
                });

                const messageParts = Object.entries(groups).map(([name, count]) => `${name} (${count})`);
                messageEl.textContent = `Você tem ${allOverdue.length} conta(s) vencida(s): ${messageParts.join(', ')}.`;
                iconBadge.textContent = allOverdue.length;

                // --- INÍCIO DA LÓGICA ATUALIZADA DO BOTÃO "VER AGORA" (AJUSTES 2 e 3) ---
                actionBtn.onclick = () => {
                    // AJUSTE 2: Navega para o mês da conta vencida mais antiga.
                    allOverdue.sort((a, b) => new Date(a.data) - new Date(b.data));
                    const oldestOverdueBill = allOverdue[0];
                    const oldestBillDate = new Date(oldestOverdueBill.data + 'T00:00:00');
                    // Define o `currentDate` global para o mês da pendência
                    currentDate = new Date(oldestBillDate.getFullYear(), oldestBillDate.getMonth(), 1);

                    // Muda para a aba de lançamentos e aplica o filtro de "vencidas"
                    switchTab('lancamentos');
                    activeFilters.status = 'vencidas';
                    updateFilterBadge();
                    updateUIForMonth(); // Atualiza a UI para o mês correto que acabamos de definir

                    // AJUSTE 3: Garante que a seção de despesas esteja aberta e rola até ela em dispositivos móveis.
                    if (window.innerWidth < 768) { // 768px é o breakpoint 'md' do Tailwind
                        const expenseSection = document.getElementById('expense-section');
                        const collapseBtn = document.querySelector('.toggle-collapse-btn[data-target="expense-section"]');
                        const icon = collapseBtn?.querySelector('i');

                        // Garante que a seção de despesas esteja visível
                        if (expenseSection && expenseSection.classList.contains('collapsed')) {
                            expenseSection.classList.remove('collapsed');
                            if (icon) {
                                icon.classList.remove('fa-chevron-down');
                                icon.classList.add('fa-chevron-up');
                            }
                        }

                        // Usamos um pequeno timeout para garantir que a UI foi renderizada antes de rolar
                        setTimeout(() => {
                            expenseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 150);
                    }

                    // Esconde o banner e o ícone após a ação
                    banner.classList.add('hidden');
                    icon.classList.add('hidden');
                };
                // --- FIM DA LÓGICA ATUALIZADA DO BOTÃO ---

                // 4. Lógica para exibir o banner OU o ícone, respeitando a escolha do usuário.
                if (icon.classList.contains('hidden')) {
                    banner.classList.remove('hidden');
                } else {
                    banner.classList.add('hidden');
                    icon.classList.remove('hidden'); // Garante que o ícone continue visível
                }

            } else {
                // 5. Se não há pendências, esconde ambos.
                banner.classList.add('hidden');
                icon.classList.add('hidden');
            }
        }

        // --- FUNÇÕES DO SIMULADOR ---
        // function openSimulationModal() {
        //     simulatedExpenses = [];
        //     simulationDate = new Date(currentDate);

        //     const modal = document.getElementById('simulationModal');
        //     modal.innerHTML = `
        //     <div class="p-6">
        //         <div class="flex justify-between items-center mb-4">
        //             <h3 class="text-xl font-bold text-gray-800"><i class="fa-solid fa-calculator mr-2"></i>Simulador de Gastos</h3>
        //             <button class="close-modal-btn text-gray-400 hover:text-gray-600"><i class="fa fa-times fa-lg"></i></button>
        //         </div>

        //         <div id="simulation-projection-container"></div>

        //         <form id="add-sim-expense-form" class="space-y-3 p-4 border rounded-lg bg-gray-50 my-4">
        //             <h4 class="font-semibold">Adicionar Novo Gasto Simulado</h4>
        //             <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        //                 <input type="text" name="desc" class="w-full border rounded-lg p-2" placeholder="Descrição do novo gasto" required>
        //                 <input type="text" name="value" class="w-full border rounded-lg p-2 text-right" placeholder="R$ 0,00" inputmode="decimal" required oninput="this.value = formatCurrencyInput(this.value)">
        //             </div>
        //              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        //                 <input type="date" name="date" class="w-full border rounded-lg p-2 text-gray-500">
        //                 <div class="flex items-center">
        //                     <input id="sim-is-installment-check" name="is-installment" type="checkbox" class="h-4 w-4 rounded border-gray-300">
        //                     <label for="sim-is-installment-check" class="ml-2 block text-sm font-medium text-gray-900">Parcelado?</label>
        //                 </div>
        //             </div>
        //             <div id="sim-installment-fields" class="hidden">
        //                  <input type="number" name="total-installments" class="w-full border rounded-lg p-2" placeholder="Nº de Parcelas" min="2">
        //             </div>
        //             <button type="submit" class="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2">
        //                 <i class="fa fa-plus"></i> Adicionar Gasto
        //             </button>
        //         </form>
                
        //         <div class="mt-6">
        //             <button id="toggle-sim-list-btn" class="font-semibold text-gray-700 w-full text-left">
        //                 Gerenciar Lançamentos Simulados <i class="fa fa-chevron-down ml-2"></i>
        //             </button>
        //             <div id="sim-list-container" class="hidden mt-2 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
        //             </div>
        //         </div>
        //     </div>`;

        //     const simForm = modal.querySelector('#add-sim-expense-form');
        //     const simInstallmentCheck = modal.querySelector('#sim-is-installment-check');
        //     const simInstallmentFields = modal.querySelector('#sim-installment-fields');
            
        //     simInstallmentCheck.addEventListener('change', (e) => simInstallmentFields.classList.toggle('hidden', !e.target.checked));
            
        //     simForm.addEventListener('submit', (e) => {
        //         e.preventDefault();
        //         const desc = simForm.elements.desc.value.trim();
        //         const totalValue = parseCurrency(simForm.elements.value.value);
        //         const date = simForm.elements.date.value;
        //         const isInstallment = simForm.elements['is-installment'].checked;
        //         const totalInstallments = isInstallment ? parseInt(simForm.elements['total-installments'].value) : 1;

        //         if (desc && totalValue > 0 && date && (!isInstallment || totalInstallments >= 2)) {
        //             simulatedExpenses.push({
        //                 id: Date.now(),
        //                 desc,
        //                 totalValue,
        //                 date,
        //                 installments: totalInstallments,
        //                 installmentValue: totalInstallments > 1 ? totalValue / totalInstallments : totalValue
        //             });
        //             simForm.reset();
        //             simInstallmentFields.classList.add('hidden');
        //             const defaultSimDate = new Date(simulationDate);
        //             defaultSimDate.setDate(15);
        //             simForm.elements.date.value = defaultSimDate.toISOString().split('T')[0];
                    
        //             renderProjection();
        //             renderAllSimulatedItems();

        //             const listContainer = modal.querySelector('#sim-list-container');
        //             const icon = modal.querySelector('#toggle-sim-list-btn i');
        //             listContainer.classList.remove('hidden');
        //             icon.classList.remove('fa-chevron-down');
        //             icon.classList.add('fa-chevron-up');
        //         }
        //     });
            
        //     modal.querySelector('#toggle-sim-list-btn').onclick = (e) => {
        //         const btn = e.currentTarget;
        //         const icon = btn.querySelector('i');
        //         const listContainer = modal.querySelector('#sim-list-container');
        //         const isHidden = listContainer.classList.contains('hidden');

        //         if(isHidden) {
        //             renderAllSimulatedItems();
        //             listContainer.classList.remove('hidden');
        //             icon.classList.remove('fa-chevron-down');
        //             icon.classList.add('fa-chevron-up');
        //         } else {
        //             listContainer.classList.add('hidden');
        //             icon.classList.remove('fa-chevron-up');
        //             icon.classList.add('fa-chevron-down');
        //         }
        //     };
            
        //     modal.addEventListener('click', (e) => {
        //         const editBtn = e.target.closest('.edit-sim-item-btn');
        //         if(editBtn) {
        //             const simId = parseInt(editBtn.dataset.id);
        //             const item = simulatedExpenses.find(item => item.id === simId);
        //             if(item) openEditSimulatedExpenseModal(item);
        //         }

        //         const deleteBtn = e.target.closest('.delete-sim-item-btn');
        //         if(deleteBtn) {
        //             const simId = parseInt(deleteBtn.dataset.id);
        //             simulatedExpenses = simulatedExpenses.filter(item => item.id !== simId);
        //             renderAllSimulatedItems();
        //             renderProjection();
        //         }
        //     });


        //     renderProjection();
        //     openModal(modal);
        // }

        // const renderProjection = () => {
        //     const projectionContainer = document.getElementById('simulation-projection-container');
        //     if (!projectionContainer) return;
            
        //     const monthTransactions = getTransactionsForMonth(simulationDate);
        //     const personalMonthTransactions = monthTransactions.filter(t => !t.thirdParty);

        //     const getSum = (type) => personalMonthTransactions.filter(t => findTypeBy('id', t.tipoId)?.main === type).reduce((acc, t) => acc + t.valor, 0);
            
        //     const totalIncome = getSum('Receita');
        //     const totalCommitted = getSum('Despesa') + getSum('Investimento') - getSum('Estorno');
            
        //     let totalSimulatedForMonth = 0;
        //     simulatedExpenses.forEach(exp => {
        //         const startDate = new Date(exp.date + 'T00:00:00');
        //         for (let i = 0; i < exp.installments; i++) {
        //             const monthDate = new Date(startDate);
        //             monthDate.setMonth(startDate.getMonth() + i);
        //             if (monthDate.getFullYear() === simulationDate.getFullYear() && monthDate.getMonth() === simulationDate.getMonth()) {
        //                 totalSimulatedForMonth += exp.installmentValue;
        //             }
        //         }
        //     });

        //     const totalExpenses = totalCommitted + totalSimulatedForMonth;
        //     const finalBalance = totalIncome - totalExpenses;
        //     const committedPercent = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
            
        //     let progressBarColor = 'bg-green-500';
        //     let budgetAlertHTML = '';
        //     if (committedPercent > 100) {
        //         progressBarColor = 'bg-red-500';
        //         budgetAlertHTML = `<div class="p-2 bg-red-100 text-red-700 font-bold text-center rounded-lg mb-2"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Orçamento Excedido!</div>`;
        //     } else if (committedPercent > 85) {
        //         progressBarColor = 'bg-yellow-500';
        //     }

        //     projectionContainer.innerHTML = `
        //         <div class="bg-white rounded-lg p-4 mb-4 border">
        //             ${budgetAlertHTML}
        //             <div class="flex items-center justify-center gap-2 mb-4">
        //                 <button id="sim-prev-month-btn" class="p-2 rounded-full hover:bg-gray-200"><i class="fa-solid fa-chevron-left"></i></button>
        //                 <h4 id="sim-month-display" class="text-lg font-bold text-gray-800 text-center w-48">${simulationDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</h4>
        //                 <button id="sim-next-month-btn" class="p-2 rounded-full hover:bg-gray-200"><i class="fa-solid fa-chevron-right"></i></button>
        //             </div>
        //             <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        //                 <div><p class="text-sm text-gray-500">Renda Base</p><p class="font-bold text-green-600 text-lg">${formatCurrency(totalIncome)}</p></div>
        //                 <div><p class="text-sm text-gray-500">Gastos Projetados</p><p class="font-bold text-red-600 text-lg">${formatCurrency(totalExpenses)}</p></div>
        //                 <div><p class="text-sm text-gray-500">Saldo Projetado</p><p class="font-bold text-lg ${finalBalance < 0 ? 'text-red-600' : 'text-blue-600'}">${formatCurrency(finalBalance)}</p></div>
        //             </div>
        //             <div class="mt-4">
        //                 <div class="flex justify-between text-xs font-medium text-gray-600 mb-1">
        //                     <span>Renda Comprometida</span>
        //                     <span>${committedPercent.toFixed(0)}%</span>
        //                 </div>
        //                 <div class="w-full bg-gray-200 rounded-full h-2.5">
        //                     <div class="${progressBarColor} h-2.5 rounded-full" style="width: ${Math.min(committedPercent, 100)}%"></div>
        //                 </div>
        //             </div>
        //         </div>`;

        //     document.getElementById('sim-prev-month-btn').onclick = () => { simulationDate.setMonth(simulationDate.getMonth() - 1); renderProjection(); };
        //     document.getElementById('sim-next-month-btn').onclick = () => { simulationDate.setMonth(simulationDate.getMonth() + 1); renderProjection(); };
        // };


        // main.js -> Substitua a função openSimulationModal

        function openSimulationModal() {
            simulatedExpenses = [];
            simulationDate = new Date(currentDate);

            const modal = document.getElementById('simulationModal');
            // AJUSTE: Classes para padding responsivo e rolagem vertical em telas pequenas.
            modal.innerHTML = `
            <div class="p-4 sm:p-6 max-h-[90vh] overflow-y-auto"> 
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg sm:text-xl font-bold text-gray-800"><i class="fa-solid fa-calculator mr-2"></i>Simulador de Gastos</h3>
                    <button class="close-modal-btn text-gray-400 hover:text-gray-600"><i class="fa fa-times fa-lg"></i></button>
                </div>

                <div id="simulation-projection-container"></div>

                <form id="add-sim-expense-form" class="space-y-4 p-4 border rounded-lg bg-gray-50 my-4">
                    <h4 class="font-semibold text-base">Adicionar Novo Gasto Simulado</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="desc" class="w-full border rounded-lg p-2 text-sm" placeholder="Descrição do novo gasto" required>
                        <input type="text" name="value" class="w-full border rounded-lg p-2 text-right text-sm" placeholder="R$ 0,00" inputmode="decimal" required oninput="this.value = formatCurrencyInput(this.value)">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <input type="date" name="date" class="w-full border rounded-lg p-2 text-gray-500 text-sm">
                        <div class="flex items-center">
                            <input id="sim-is-installment-check" name="is-installment" type="checkbox" class="h-4 w-4 rounded border-gray-300">
                            <label for="sim-is-installment-check" class="ml-2 block text-sm font-medium text-gray-900">Parcelado?</label>
                        </div>
                    </div>
                    <div id="sim-installment-fields" class="hidden">
                        <input type="number" name="total-installments" class="w-full border rounded-lg p-2 text-sm" placeholder="Nº de Parcelas" min="2">
                    </div>
                    <button type="submit" class="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 text-sm font-bold">
                        <i class="fa fa-plus"></i> Adicionar Gasto
                    </button>
                </form>
                
                <div class="mt-6">
                    <button id="toggle-sim-list-btn" class="font-semibold text-gray-700 w-full text-left text-sm sm:text-base">
                        Gerenciar Lançamentos Simulados <i class="fa fa-chevron-down ml-2"></i>
                    </button>
                    <div id="sim-list-container" class="hidden mt-2 p-2 sm:p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                    </div>
                </div>
            </div>`;

            const simForm = modal.querySelector('#add-sim-expense-form');
            const simInstallmentCheck = modal.querySelector('#sim-is-installment-check');
            const simInstallmentFields = modal.querySelector('#sim-installment-fields');
            
            simInstallmentCheck.addEventListener('change', (e) => simInstallmentFields.classList.toggle('hidden', !e.target.checked));
            
            simForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const desc = simForm.elements.desc.value.trim();
                const totalValue = parseCurrency(simForm.elements.value.value);
                const date = simForm.elements.date.value;
                const isInstallment = simForm.elements['is-installment'].checked;
                const totalInstallments = isInstallment ? parseInt(simForm.elements['total-installments'].value) : 1;

                if (desc && totalValue > 0 && date && (!isInstallment || totalInstallments >= 2)) {
                    simulatedExpenses.push({
                        id: Date.now(),
                        desc,
                        totalValue,
                        date,
                        installments: totalInstallments,
                        installmentValue: totalInstallments > 1 ? totalValue / totalInstallments : totalValue
                    });
                    simForm.reset();
                    simInstallmentFields.classList.add('hidden');
                    const defaultSimDate = new Date(simulationDate);
                    defaultSimDate.setDate(15);
                    simForm.elements.date.value = defaultSimDate.toISOString().split('T')[0];
                    
                    renderProjection();
                    renderAllSimulatedItems();

                    const listContainer = modal.querySelector('#sim-list-container');
                    const icon = modal.querySelector('#toggle-sim-list-btn i');
                    listContainer.classList.remove('hidden');
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                }
            });
            
            modal.querySelector('#toggle-sim-list-btn').onclick = (e) => {
                const btn = e.currentTarget;
                const icon = btn.querySelector('i');
                const listContainer = modal.querySelector('#sim-list-container');
                const isHidden = listContainer.classList.contains('hidden');

                if(isHidden) {
                    renderAllSimulatedItems();
                    listContainer.classList.remove('hidden');
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                } else {
                    listContainer.classList.add('hidden');
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            };
            
            modal.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-sim-item-btn');
                if(editBtn) {
                    const simId = parseInt(editBtn.dataset.id);
                    const item = simulatedExpenses.find(item => item.id === simId);
                    if(item) openEditSimulatedExpenseModal(item);
                }

                const deleteBtn = e.target.closest('.delete-sim-item-btn');
                if(deleteBtn) {
                    const simId = parseInt(deleteBtn.dataset.id);
                    simulatedExpenses = simulatedExpenses.filter(item => item.id !== simId);
                    renderAllSimulatedItems();
                    renderProjection();
                }
            });


            renderProjection();
            openModal(modal);
        }

        // main.js -> Substitua a função renderProjection

        const renderProjection = () => {
            const projectionContainer = document.getElementById('simulation-projection-container');
            if (!projectionContainer) return;
            
            const monthTransactions = getTransactionsForMonth(simulationDate);
            const personalMonthTransactions = monthTransactions.filter(t => !t.thirdParty);

            const getSum = (type) => personalMonthTransactions.filter(t => findTypeBy('id', t.tipoId)?.main === type).reduce((acc, t) => acc + t.valor, 0);
            
            const totalIncome = getSum('Receita');
            const totalCommitted = getSum('Despesa') + getSum('Investimento') - getSum('Estorno');
            
            let totalSimulatedForMonth = 0;
            simulatedExpenses.forEach(exp => {
                const startDate = new Date(exp.date + 'T00:00:00');
                for (let i = 0; i < exp.installments; i++) {
                    const monthDate = new Date(startDate);
                    monthDate.setMonth(startDate.getMonth() + i);
                    if (monthDate.getFullYear() === simulationDate.getFullYear() && monthDate.getMonth() === simulationDate.getMonth()) {
                        totalSimulatedForMonth += exp.installmentValue;
                    }
                }
            });

            const totalExpenses = totalCommitted + totalSimulatedForMonth;
            const finalBalance = totalIncome - totalExpenses;
            const committedPercent = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
            
            let progressBarColor = 'bg-green-500';
            let budgetAlertHTML = '';
            if (committedPercent > 100) {
                progressBarColor = 'bg-red-500';
                budgetAlertHTML = `<div class="p-2 bg-red-100 text-red-700 font-bold text-center rounded-lg mb-2"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Orçamento Excedido!</div>`;
            } else if (committedPercent > 85) {
                progressBarColor = 'bg-yellow-500';
            }

            // AJUSTE: Classes responsivas para fontes, larguras e espaçamentos.
            projectionContainer.innerHTML = `
                <div class="bg-white rounded-lg p-3 sm:p-4 mb-4 border">
                    ${budgetAlertHTML}
                    <div class="flex items-center justify-center gap-2 mb-4">
                        <button id="sim-prev-month-btn" class="p-2 rounded-full hover:bg-gray-200"><i class="fa-solid fa-chevron-left text-xs"></i></button>
                        <h4 id="sim-month-display" class="text-base sm:text-lg font-bold text-gray-800 text-center w-36 sm:w-48">${simulationDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</h4>
                        <button id="sim-next-month-btn" class="p-2 rounded-full hover:bg-gray-200"><i class="fa-solid fa-chevron-right text-xs"></i></button>
                    </div>
                    <div class="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                        <div><p class="text-xs sm:text-sm text-gray-500">Renda Base</p><p class="font-bold text-green-600 text-sm sm:text-lg">${formatCurrency(totalIncome)}</p></div>
                        <div><p class="text-xs sm:text-sm text-gray-500">Gastos Projetados</p><p class="font-bold text-red-600 text-sm sm:text-lg">${formatCurrency(totalExpenses)}</p></div>
                        <div><p class="text-xs sm:text-sm text-gray-500">Saldo Projetado</p><p class="font-bold text-sm sm:text-lg ${finalBalance < 0 ? 'text-red-600' : 'text-blue-600'}">${formatCurrency(finalBalance)}</p></div>
                    </div>
                    <div class="mt-4">
                        <div class="flex justify-between text-xs font-medium text-gray-600 mb-1">
                            <span>Renda Comprometida</span>
                            <span>${committedPercent.toFixed(0)}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2 sm:h-2.5">
                            <div class="${progressBarColor} h-2 sm:h-2.5 rounded-full" style="width: ${Math.min(committedPercent, 100)}%"></div>
                        </div>
                    </div>
                </div>`;

            document.getElementById('sim-prev-month-btn').onclick = () => { simulationDate.setMonth(simulationDate.getMonth() - 1); renderProjection(); };
            document.getElementById('sim-next-month-btn').onclick = () => { simulationDate.setMonth(simulationDate.getMonth() + 1); renderProjection(); };
        };
        const renderAllSimulatedItems = () => {
            const listContainer = document.getElementById('sim-list-container');
            if(!listContainer) return;

            if(simulatedExpenses.length === 0) {
                listContainer.innerHTML = '<p class="text-center text-gray-500">Nenhum gasto simulado adicionado.</p>';
                return;
            }

            listContainer.innerHTML = simulatedExpenses.map(item => {
                const valueText = item.installments > 1 
                    ? `${item.installments}x de ${formatCurrency(item.installmentValue)}` 
                    : formatCurrency(item.totalValue);
                return `
                <div class="flex justify-between items-center p-2 border-b last:border-0">
                    <div>
                        <p class="font-medium">${item.desc}</p>
                        <p class="text-xs text-gray-500">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')} | ${valueText}</p>
                    </div>
                    <div class="flex gap-3">
                        <button class="edit-sim-item-btn text-blue-500 hover:text-blue-700" data-id="${item.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="delete-sim-item-btn text-red-500 hover:text-red-700" data-id="${item.id}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
                `;
            }).join('');
        };
        
        // function openEditSimulatedExpenseModal(item) {
        //      const modal = document.getElementById('editSimulatedExpenseModal');
        //      modal.innerHTML = `
        //         <div class="p-6">
        //             <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold">Editar Gasto Simulado</h3><button class="close-modal-btn"><i class="fa fa-times"></i></button></div>
        //             <form id="edit-sim-expense-form" class="space-y-3">
        //                 <input type="hidden" name="id" value="${item.id}">
        //                 <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        //                     <input type="text" name="desc" class="w-full border p-2 rounded-lg" value="${item.desc}" required>
        //                     <input type="text" name="value" class="w-full border p-2 rounded-lg text-right" value="${formatCurrencyInput(String(item.totalValue * 100))}" required oninput="this.value = formatCurrencyInput(this.value)">
        //                 </div>
        //                 <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        //                     <input type="date" name="date" class="w-full border p-2 rounded-lg" value="${item.date}">
        //                     <div class="flex items-center">
        //                         <input id="edit-sim-is-installment-check" name="is-installment" type="checkbox" ${item.installments > 1 ? 'checked' : ''}>
        //                         <label for="edit-sim-is-installment-check" class="ml-2">Parcelado?</label>
        //                     </div>
        //                 </div>
        //                 <div id="edit-sim-installment-fields" class="${item.installments > 1 ? '' : 'hidden'}">
        //                     <input type="number" name="total-installments" class="w-full border p-2 rounded-lg" value="${item.installments > 1 ? item.installments : '2'}" min="2">
        //                 </div>
        //                 <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded-lg">Salvar Alterações</button>
        //             </form>
        //         </div>
        //      `;

        //     const form = modal.querySelector('#edit-sim-expense-form');
        //     const check = modal.querySelector('#edit-sim-is-installment-check');
        //     const fields = modal.querySelector('#edit-sim-installment-fields');

        //     check.onchange = () => fields.classList.toggle('hidden', !check.checked);

        //     form.onsubmit = (e) => {
        //         e.preventDefault();
        //         const id = parseInt(form.elements.id.value);
        //         const desc = form.elements.desc.value;
        //         const totalValue = parseCurrency(form.elements.value.value);
        //         const date = form.elements.date.value;
        //         const isInstallment = form.elements['is-installment'].checked;
        //         const totalInstallments = isInstallment ? parseInt(form.elements['total-installments'].value) : 1;

        //         const itemIndex = simulatedExpenses.findIndex(i => i.id === id);
        //         if (itemIndex > -1) {
        //             simulatedExpenses[itemIndex] = {
        //                 id, desc, totalValue, date,
        //                 installments: totalInstallments,
        //                 installmentValue: totalInstallments > 1 ? totalValue / totalInstallments : totalValue
        //             };
        //         }
        //         closeModal();
        //         renderAllSimulatedItems();
        //         renderProjection();
        //     };

        //     openModal(modal);
        // }
        // main.js

        // main.js

function openEditSimulatedExpenseModal(item) {
    const modal = document.getElementById('editSimulatedExpenseModal');
    modal.innerHTML = `
       <div class="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
           <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold">Editar Gasto Simulado</h3><button class="close-modal-btn"><i class="fa fa-times"></i></button></div>
           <form id="edit-sim-expense-form" class="space-y-3">
               <input type="hidden" name="id" value="${item.id}">
               <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <input type="text" name="desc" class="w-full border p-2 rounded-lg" value="${item.desc}" required>
                   <input type="text" name="value" class="w-full border p-2 rounded-lg text-right" value="${formatCurrencyInput(String(item.totalValue * 100))}" required oninput="this.value = formatCurrencyInput(this.value)">
               </div>
               <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                   <input type="date" name="date" class="w-full border p-2 rounded-lg" value="${item.date}">
                   <div class="flex items-center">
                       <input id="edit-sim-is-installment-check" name="is-installment" type="checkbox" ${item.installments > 1 ? 'checked' : ''}>
                       <label for="edit-sim-is-installment-check" class="ml-2">Parcelado?</label>
                   </div>
               </div>
               <div id="edit-sim-installment-fields" class="${item.installments > 1 ? '' : 'hidden'}">
                   <input type="number" name="total-installments" class="w-full border p-2 rounded-lg" value="${item.installments > 1 ? item.installments : '2'}" min="2">
               </div>
               <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded-lg">Salvar Alterações</button>
           </form>
       </div>
    `;

   const form = modal.querySelector('#edit-sim-expense-form');
   const check = modal.querySelector('#edit-sim-is-installment-check');
   const fields = modal.querySelector('#edit-sim-installment-fields');

   check.onchange = () => fields.classList.toggle('hidden', !check.checked);

   form.onsubmit = (e) => {
       e.preventDefault();
       const id = parseInt(form.elements.id.value);
       const desc = form.elements.desc.value;
       const totalValue = parseCurrency(form.elements.value.value);
       const date = form.elements.date.value;
       const isInstallment = form.elements['is-installment'].checked;
       const totalInstallments = isInstallment ? parseInt(form.elements['total-installments'].value) : 1;

       const itemIndex = simulatedExpenses.findIndex(i => i.id === id);
       if (itemIndex > -1) {
           simulatedExpenses[itemIndex] = {
               id, desc, totalValue, date,
               installments: totalInstallments,
               installmentValue: totalInstallments > 1 ? totalValue / totalInstallments : totalValue
           };
       }

       // CORREÇÃO: Em vez de chamar a função global closeModal(),
       // escondemos apenas o modal de edição específico.
       modal.classList.add('hidden');
       
       // A atualização da lista de itens e da projeção continua normal.
       renderAllSimulatedItems();
       renderProjection();
   };

   openModal(modal);
}

        function formatCurrencyInput(value) {
            if (value === null || typeof value === 'undefined') return '';
            let v = String(value).replace(/\D/g,'');
            v = (v/100).toFixed(2) + '';
            v = v.replace(".", ",");
            v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            return v;
        }
        window.formatCurrencyInput = formatCurrencyInput;

        function openAddEditThirdPartyDebtModal(data) {
            const modal = document.getElementById('thirdPartyDebtModal');
            const form = modal.querySelector('#third-party-debt-form');
            const title = modal.querySelector('#thirdPartyDebtModalTitle');
        
            if (!form || !title) {
                console.error("Não foi possível encontrar os elementos do modal de dívida de terceiro.");
                return;
            }
            form.reset();
        
            const cardSelect = form.elements.cardId;
            cardSelect.innerHTML = '<option value="geral">Sem cartão</option>';
            settings.cartoes.forEach(card => {
                const option = document.createElement('option');
                option.value = card.id;
                option.textContent = `${card.name} (${card.bandeira}) - vence dia ${card.diaVencimento}`;
                cardSelect.appendChild(option);
            });
        
            const dateInput = form.elements.date;
        
            cardSelect.addEventListener('change', () => {
                const cardId = cardSelect.value;
                if (!cardId || cardId === 'geral') {
                    return;
                }
                const card = settings.cartoes.find(c => c.id == cardId);
                if (!card) return;
        
                const dueDateDay = parseInt(card.diaVencimento);
                let nextDueDate = new Date(currentDate);
        
                // Se a data atual já passou do dia do vencimento, assume a fatura do próximo mês
                if (nextDueDate.getDate() > dueDateDay) {
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                }
                nextDueDate.setDate(dueDateDay);
        
                dateInput.value = nextDueDate.toISOString().split('T')[0];
            });
            // --- FIM DO CÓDIGO APLICADO ---
        
            const isEditing = !!data.id;
            const installmentContainer = form.querySelector('#third-party-debt-installments');
            const installmentCheck = form.querySelector('#tp-is-installment-check');
            const installmentFields = form.querySelector('#tp-installment-fields');
            const isFirstInstallment = form.querySelector('#tp-isFirstInstallment');
            const totalInstallmentsInput = form.querySelector('#tp-total-installments');
        
            installmentContainer.classList.remove('hidden');
            installmentCheck.onchange = () => {
                isFirstInstallment.classList.toggle('hidden', !installmentCheck.checked);
                installmentFields.classList.toggle('hidden', !installmentCheck.checked);
            };
        
            if (isEditing) {
                title.textContent = 'Editar Dívida';
                form.elements.debtId.value = data.id;
                form.elements.thirdPartyName.value = data.thirdParty || '' ;
                form.elements.cardId.value = data.cartaoId || 'geral';
                form.elements.description.value = data.descricao;
                form.elements.value.value = formatCurrencyInput(String(data.valor * 100));
                form.elements.date.value = data.data;
        
                if (data.installments) {
                    installmentCheck.checked = true;
                    installmentFields.classList.remove('hidden');
                    isFirstInstallment.classList.remove('hidden');
                    totalInstallmentsInput.value = data.installments.total;
                } else {
                    installmentCheck.checked = false;
                    installmentFields.classList.add('hidden');
                    isFirstInstallment.classList.add('hidden');
                    totalInstallmentsInput.value = '';
                }
        
            } else {
                title.textContent = 'Adicionar Dívida';
                form.elements.debtId.value = '';
                form.elements.thirdPartyName.value = data.personName || '';
                form.elements.cardId.value = data.cardId;
                form.elements.date.valueAsDate = new Date();
                installmentCheck.checked = false;
                installmentFields.classList.add('hidden');
                totalInstallmentsInput.value = '';
            }
        
            openModal(modal);
        }

        const thirdPartyDebtForm = document.getElementById('third-party-debt-form');
        if (thirdPartyDebtForm) {
            thirdPartyDebtForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(thirdPartyDebtForm);
                const debtId = formData.get('debtId');
                const isFirstInstallment = document.querySelector('input[name="installmentStatus"]:checked').value === 'first';
                const initialInstallmentNumber = isFirstInstallment ? 1 : parseInt(document.getElementById('initialInstallmentNumber').value, 10);


                const transactionData = {
                    descricao: formData.get('description'),
                    valor: parseCurrency(formData.get('value')),
                    data: formData.get('date'),
                    thirdParty: formData.get('thirdPartyName'),
                    cartaoId: formData.get('cardId') === 'geral' ? null : parseInt(formData.get('cardId')),
                    tipoId: settings.tipos.find(t => t.name === 'Compras')?.id || 4,
                    categoria: 'Empréstimo',
                    pago: false,
                    thirdPartyPaid: false,
                    isFirstInstallment: isFirstInstallment,
                    initialInstallmentNumber: initialInstallmentNumber,
                };

                if (!transactionData.descricao || !transactionData.valor || !transactionData.data || !transactionData.thirdParty) {
                    alert('Por favor, preencha todos os campos obrigatórios.');
                    return;
                }
                const isInstallment = formData.get('is-installment') === 'on';
                if (debtId) {
    const originalTransaction = transactions.find(t => t.id === debtId);
    if (originalTransaction && originalTransaction.groupId) {
        const groupIdToDelete = originalTransaction.groupId;
        const txsToDelete = transactions.filter(t => t.groupId === groupIdToDelete);
        for (const tx of txsToDelete) {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', tx.id));
        }
        transactions = transactions.filter(t => t.groupId !== groupIdToDelete);
    } else if (originalTransaction) {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', debtId));
        transactions = transactions.filter(t => t.id !== debtId);
    }
}

// Lógica de criação de parcelas ajustada
if (isInstallment) {
    const totalInstallments = parseInt(formData.get('total-installments'), 10);
    if (isNaN(totalInstallments) || totalInstallments <= 1) {
        openGenericConfirmModal({
            title: 'Ação Inválida',
            message: `Número de parcelas inválido. Deve ser 2 ou mais.`,
            confirmText: 'Entendi',
            iconClass: 'fa-solid fa-ban text-red-500'
        });
        return;
    }
    
    // Validar se o número da parcela inicial não é maior que o total de parcelas
    if (initialInstallmentNumber > totalInstallments) {
        openGenericConfirmModal({
            title: 'Ação Inválida',
            message: `O número da parcela inicial não pode ser maior que o total de parcelas.`,
            confirmText: 'Entendi',
            iconClass: 'fa-solid fa-ban text-red-500'
        });
        return;
    }

    const installmentValue = transactionData.valor;
    const totalValue = installmentValue * totalInstallments;
    const baseDate = new Date(transactionData.data + 'T00:00:00');
    const newGroupId = Date.now();

    // O loop agora começa do número da parcela inicial
    for (let i = initialInstallmentNumber; i <= totalInstallments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + (i - initialInstallmentNumber));
        const newInstallment = {
            ...transactionData,
            groupId: newGroupId,
            valor: installmentValue,
            data: installmentDate.toISOString().split('T')[0],
            installments: { current: i, total: totalInstallments, totalValue: totalValue }
        };
        const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), newInstallment);
        transactions.push({ ...newInstallment, id: docRef.id });
    }
} else {
    const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), transactionData);
    transactions.push({ ...transactionData, id: docRef.id });
}

                closeModal();
                updateUIForMonth();
            });
        }
        
        // function openRegisterThirdPartyPaymentModal(personName) {
        //     const modal = document.getElementById('thirdPartyPaymentModal');
        //     if(!modal) {
        //         console.error("Modal de pagamento de terceiro não encontrado no HTML!");
        //         return;
        //     }
        //     const form = modal.querySelector('form');
        //     form.reset();
        //     form.elements.thirdPartyName.value = personName;
        //     form.elements.date.valueAsDate = new Date();
        //     modal.querySelector('#thirdPartyPaymentModalTitle').textContent = `Registrar Pagamento de ${personName}`;
        //     openModal(modal);
        // }

        function openRegisterThirdPartyPaymentModal(personName) {
            const modal = document.getElementById('thirdPartyPaymentModal');
            if(!modal) {
                console.error("Modal de pagamento de terceiro não encontrado no HTML!");
                return;
            }
            const form = modal.querySelector('form');
            form.reset();
            form.elements.thirdPartyName.value = personName;
            form.elements.date.valueAsDate = new Date();
            modal.querySelector('#thirdPartyPaymentModalTitle').textContent = `Registrar crédito de ${personName}`;
            openModal(modal);
        }

        const thirdPartyPaymentForm = document.getElementById('third-party-payment-form');
if (thirdPartyPaymentForm) {
    thirdPartyPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(thirdPartyPaymentForm);
        const valor = parseCurrency(formData.get('value'));
        const personName = formData.get('thirdPartyName');
    
        if (isNaN(valor) || valor <= 0) {
            alert('Valor inválido.');
            return;
        }
    
        // CORREÇÃO: Garante que o objeto de créditos exista antes de somar
        if (!settings.thirdPartyCredits) {
            settings.thirdPartyCredits = {};
        }
        if (!settings.thirdPartyCredits[personName]) {
            settings.thirdPartyCredits[personName] = 0;
        }
        settings.thirdPartyCredits[personName] += valor;
        await saveSettings(); // Salva o novo saldo de crédito no Firestore
    
        const paymentRecord = {
            descricao: `Crédito recebido de ${personName}`,
            valor: valor,
            data: formData.get('date'),
            thirdParty: personName,
            tipoId: settings.tipos.find(t => t.name === 'Pagamento Recebido')?.id || 9,
            categoria: 'Crédito de Terceiro',
            isCreditRecord: true 
        };
    
        const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), paymentRecord);
        transactions.push({ ...paymentRecord, id: docRef.id });
    
        closeModal();
        updateUIForMonth();
    });
}

        // function renderThirdPartyView() {
        //     const container = document.getElementById('terceiros-view-content');
        //     const emptyState = document.getElementById('empty-state-terceiros');
        //     if (!container || !emptyState) return;

        //     container.innerHTML = '';

        //     const monthTransactions = getTransactionsForMonth(currentDate);
        //     const transactionsWithThirdParty = monthTransactions.filter(t => t.thirdParty && t.thirdParty.trim() !== '');
        //     const groupedByName = transactionsWithThirdParty.reduce((acc, t) => {
        //         const name = t.thirdParty.trim();
        //         if (!acc[name]) acc[name] = [];
        //         acc[name].push(t);
        //         return acc;
        //     }, {});

        //     if (Object.keys(groupedByName).length === 0) {
        //         emptyState.classList.remove('hidden');
        //         container.classList.add('hidden');
        //         return;
        //     }

        //     emptyState.classList.add('hidden');
        //     container.classList.remove('hidden');
        //     container.classList.add('space-y-4');

        //     for (const name in groupedByName) {
        //         const personTransactions = groupedByName[name];
        //         const totalDue = personTransactions.reduce((sum, t) => {
        //             if (t.valor > 0 && t.thirdPartyPaid) {
        //                 return sum; 
        //             }
        //             return sum + t.valor;
        //         }, 0);

        //         const groupedByCard = personTransactions.reduce((acc, t) => {
        //             const cardId = t.cartaoId || 'geral';
        //             if (!acc[cardId]) acc[cardId] = [];
        //             acc[cardId].push(t);
        //             return acc;
        //         }, {});

        //         const cardElement = document.createElement('div');
        //         cardElement.className = 'bg-white p-4 sm:p-5 rounded-xl shadow-md transition-all duration-300';
        //         cardElement.dataset.personName = name;

        //         let tabsHTML = `<div class="flex items-center border-b border-gray-200 -mx-5 px-5 mb-3 overflow-x-auto">
        //                         <button data-tab-id="resumo" class="third-party-tab-btn whitespace-nowrap py-3 px-4 text-sm font-medium border-b-2 border-blue-500 text-blue-600">Resumo</button>`;
                
        //         for (const cardId in groupedByCard) {
        //             const cardInfo = settings.cartoes.find(c => c.id == cardId);
        //             const tabName = cardInfo ? `Fatura ${cardInfo.name}` : 'Outras Contas';
        //             tabsHTML += `<button data-tab-id="${cardId}" class="third-party-tab-btn whitespace-nowrap py-3 px-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">${tabName}</button>`;
        //         }
        //         tabsHTML += '</div>';

        //         let tabsContentHTML = '';
        //         let resumoContentHTML = '<div data-tab-content-id="resumo" class="tab-content space-y-5">';
        //         for (const cardId in groupedByCard) {
        //             const cardTransactions = groupedByCard[cardId];
        //             const cardInfo = settings.cartoes.find(c => c.id == cardId);
        //             const cardTotal = cardTransactions.reduce((sum, t) => sum + t.valor, 0);
        //             const cardTitle = cardInfo ? `Fatura ${cardInfo.name}` : 'Outras Contas';
        //             const cardDueDate = cardInfo ? `Vencimento dia ${cardInfo.diaVencimento}` : '';

        //             const debtItemsHTML = cardTransactions.map(t => {
        //                 const isPayment = findTypeBy('id', t.tipoId)?.main === 'Recebimento';
        //                 let desc = t.descricao;
        //                 if (t.installments) {
        //                    desc += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total})</span>`;
        //                 }
        //                 return `
        //                 <li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 ${t.thirdPartyPaid ? 'opacity-50' : ''}">
        //                     <div class="flex items-center gap-3">
        //                         <input type="checkbox" class="quit-third-party-debt-check h-4 w-4 rounded border-gray-300" data-debt-id="${t.id}" ${t.thirdPartyPaid ? 'checked' : ''} ${isPayment ? 'disabled' : ''}>
        //                         <div>
        //                             <p class="font-medium ${t.thirdPartyPaid ? 'line-through' : ''} ${isPayment ? 'text-green-600' : 'text-gray-800'}">${desc}</p>
        //                             <p class="text-xs text-gray-500">${new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
        //                         </div>
        //                     </div>
        //                     <span class="font-mono font-semibold ${isPayment ? 'text-green-600' : 'text-gray-700'}">${formatCurrency(t.valor)}</span>
        //                 </li>`;
        //             }).join('');

        //             resumoContentHTML += `
        //                 <div>
        //                     <div class="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg">
        //                         <h4 class="font-semibold text-gray-800">${cardTitle}</h4>
        //                         <span class="text-sm text-gray-500">${cardDueDate}</span>
        //                     </div>
        //                     <ul class="p-3 border-l border-r border-b rounded-b-lg">${debtItemsHTML}</ul>
        //                     <p class="text-right font-bold text-gray-800 pr-2 pt-1">Subtotal: ${formatCurrency(cardTotal)}</p>
        //                 </div>
        //             `;
        //         }
        //         resumoContentHTML += '</div>';
        //         tabsContentHTML += resumoContentHTML;
                
        //         for (const cardId in groupedByCard) {
        //             const cardTransactions = groupedByCard[cardId];
        //             const cardInfo = settings.cartoes.find(c => c.id == cardId);
        //             const cardTotal = cardTransactions.reduce((sum, t) => sum + t.valor, 0);

        //             const debtItemsHTML = cardTransactions.map(t => {
        //                  const isPayment = findTypeBy('id', t.tipoId)?.main === 'Recebimento';
        //                  let desc = t.descricao;
        //                  if (t.installments) {
        //                    desc += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total})</span>`;
        //                  }
        //                 return `
        //                 <li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 ${t.thirdPartyPaid ? 'opacity-50' : ''}">
        //                    <div class="flex items-center gap-3">
        //                         <input type="checkbox" class="quit-third-party-debt-check h-4 w-4 rounded border-gray-300" data-debt-id="${t.id}" ${t.thirdPartyPaid ? 'checked' : ''} ${isPayment ? 'disabled' : ''}>
        //                         <div>
        //                             <p class="font-medium ${t.thirdPartyPaid ? 'line-through' : ''} ${isPayment ? 'text-green-600' : 'text-gray-800'}">${desc}</p>
        //                             <p class="text-xs text-gray-500">${new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
        //                         </div>
        //                     </div>
        //                     <div class="flex items-center gap-4">
        //                         <span class="font-mono font-semibold ${isPayment ? 'text-green-600' : 'text-gray-700'}">${formatCurrency(t.valor)}</span>
        //                         <button class="edit-debt-btn text-gray-400 hover:text-blue-500" data-debt-id="${t.id}">
        //                             <i class="fa-solid fa-pen-to-square"></i>
        //                         </button>
        //                         <button class="delete-debt-btn text-gray-400 hover:text-red-500" data-debt-id="${t.id}"><i class="fa-solid fa-trash-can"></i></button>
        //                     </div>
        //                 </li>`;
        //             }).join('');

        //             tabsContentHTML += `
        //                 <div data-tab-content-id="${cardId}" class="tab-content hidden">
        //                     <div class="flex flex-wrap justify-between items-center bg-gray-50 p-3 rounded-lg mb-3">
        //                         <div class="text-sm">
        //                             <span class="font-semibold text-gray-800">Total: ${formatCurrency(cardTotal)}</span>
        //                             ${cardInfo ? `<span class="text-gray-500 ml-4">Venc. Fatura: dia ${cardInfo.diaVencimento}</span>` : ''}
        //                         </div>
        //                         <div class="flex items-center gap-2">
        //                              <button class="add-debt-btn text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-full w-8 h-8 flex items-center justify-center" title="Adicionar Dívida"><i class="fa fa-plus"></i></button>
        //                         </div>
        //                     </div>
        //                     <ul class="space-y-1">${debtItemsHTML}</ul>
        //                 </div>`;
        //         }


        //         cardElement.innerHTML = `
        //             <div class="flex justify-between items-center">
        //                 <div class="flex items-center gap-3 flex-grow cursor-pointer details-toggle-btn">
        //                     <h3 class="text-lg font-bold text-gray-900">${name}</h3>
        //                      <div class="flex items-center gap-2">
        //                         <button class="share-summary-btn text-green-500 hover:text-green-600" title="Compartilhar Resumo de ${name}" data-person-name="${name}">
        //                             <i class="fa-brands fa-whatsapp fa-lg"></i>
        //                         </button>
        //                         <button class="register-payment-btn text-blue-500 hover:text-blue-600" title="Registrar Pagamento de ${name}" data-person-name="${name}">
        //                             <i class="fa-solid fa-hand-holding-dollar fa-lg"></i>
        //                         </button>
        //                     </div>
        //                 </div>
        //                 <div class="text-right flex-shrink-0">
        //                     <p class="font-bold text-lg ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(totalDue)}</p>
        //                     <span class="text-sm text-gray-500">Saldo Devedor</span>
        //                 </div>
        //                 <i class="fa-solid fa-chevron-down details-chevron ml-4 transition-transform details-toggle-btn cursor-pointer"></i>
        //             </div>
        //             <div class="third-party-details hidden mt-4 pt-4 border-t border-gray-200">
        //                 ${tabsHTML}
        //                 ${tabsContentHTML}
        //             </div>
        //         `;

        //         container.appendChild(cardElement);
        //     }
        // }

        function openApplyCreditModal(personName) {
            const modal = document.getElementById('applyCreditModal');
            const creditAvailable = settings.thirdPartyCredits[personName] || 0;
        
            const unpaidDebtsForMonth = transactions.filter(t => {
                const tDate = new Date(t.data + 'T00:00:00');
                return t.thirdParty === personName && 
                       !t.thirdPartyPaid && 
                       !t.isCreditRecord &&
                       tDate.getFullYear() === currentDate.getFullYear() &&
                       tDate.getMonth() === currentDate.getMonth();
            }).sort((a,b) => new Date(a.data) - new Date(b.data));
        
            if (unpaidDebtsForMonth.length === 0) {
                openGenericConfirmModal({ title: 'Nenhuma Dívida no Mês', message: `${personName} não possui dívidas pendentes para quitar no mês de ${currentDate.toLocaleDateString('pt-BR', { month: 'long' })}.`, confirmText: 'Ok', iconClass: 'fa-solid fa-check-circle text-green-500' });
                return;
            }
        
            let debtListHTML = unpaidDebtsForMonth.map(debt => `
                <li class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center flex-grow">
                        <input type="checkbox" id="debt-${debt.id}" class="debt-to-pay-checkbox h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500" data-debt-id="${debt.id}">
                        <div class="ml-3">
                            <label for="debt-${debt.id}" class="font-medium text-gray-800 cursor-pointer">${debt.descricao}</label>
                            <p class="text-sm text-gray-500">${new Date(debt.data + 'T00:00:00').toLocaleDateString('pt-BR')} - ${formatCurrency(debt.valor)}</p>
                        </div>
                    </div>
                    <div class="flex-shrink-0">
                        <button type="button" class="edit-debt-from-modal-btn text-gray-400 hover:text-blue-500 p-2" data-debt-id="${debt.id}" title="Editar Dívida">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                    </div>
                </li>
            `).join('');
        
            modal.innerHTML = `
            <div class="relative mx-auto p-6 border w-full max-w-lg shadow-lg rounded-xl bg-white">
                <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-gray-800">Aplicar Crédito de ${personName}</h3><button class="close-modal-btn text-gray-400 hover:text-gray-600"><i class="fa fa-times fa-lg"></i></button></div>
                <div class="bg-blue-100 text-blue-800 p-4 rounded-lg mb-4 text-center"><p class="text-sm">Crédito Disponível (Geral)</p><p id="credit-available-display" class="text-2xl font-bold">${formatCurrency(creditAvailable)}</p></div>
                <form id="apply-credit-form">
                    <h4 class="font-semibold mb-2">Selecione as dívidas a quitar (Mês Corrente):</h4>
                    <ul class="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">${debtListHTML}</ul>
                    <div class="border-t pt-4 space-y-2"><div class="flex justify-between font-medium"><span>Total Selecionado:</span><span id="total-selected-display">R$ 0,00</span></div><div class="flex justify-between font-bold text-lg"><span>Crédito Restante:</span><span id="remaining-credit-display" class="text-green-600">${formatCurrency(creditAvailable)}</span></div></div>
                    <div class="flex justify-end mt-6"><button type="submit" id="confirm-apply-credit-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled>Confirmar Quitação</button></div>
                </form>
            </div>
            `;
        
            const form = modal.querySelector('#apply-credit-form');
            const checkboxes = form.querySelectorAll('.debt-to-pay-checkbox');
            const totalSelectedEl = form.querySelector('#total-selected-display');
            const remainingCreditEl = form.querySelector('#remaining-credit-display');
            const confirmBtn = form.querySelector('#confirm-apply-credit-btn');
        
            let isPartialPayment = false;
        
            function updateTotal() {
                let totalSelectedValue = 0;
                let selectedCount = 0;
                checkboxes.forEach(cb => {
                    if (cb.checked) {
                        selectedCount++;
                        const transaction = transactions.find(t => t.id === cb.dataset.debtId);
                        if (transaction) totalSelectedValue += transaction.valor;
                    }
                });
        
                const remainingCredit = creditAvailable - totalSelectedValue;
                totalSelectedEl.textContent = formatCurrency(totalSelectedValue);
                remainingCreditEl.textContent = formatCurrency(remainingCredit);
                remainingCreditEl.classList.toggle('text-red-600', remainingCredit < 0);
                remainingCreditEl.classList.toggle('text-green-600', remainingCredit >= 0);
        
                // NOVA LÓGICA DO BOTÃO
                isPartialPayment = selectedCount === 1 && remainingCredit < 0 && creditAvailable > 0;
                
                if (isPartialPayment) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Aplicar Parcialmente (${formatCurrency(creditAvailable)})`;
                    confirmBtn.classList.remove('bg-blue-600');
                    confirmBtn.classList.add('bg-orange-500', 'hover:bg-orange-600');
                } else {
                    confirmBtn.disabled = (totalSelectedValue === 0 || remainingCredit < 0);
                    confirmBtn.innerHTML = 'Confirmar Quitação';
                    confirmBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600');
                    confirmBtn.classList.add('bg-blue-600');
                }
            }
        
            checkboxes.forEach(cb => cb.addEventListener('change', updateTotal));
        
            modal.addEventListener('click', (e) => {
                // ... sua lógica de abrir o modal de edição
            });
        
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked);
        
                if (isPartialPayment && selectedCheckboxes.length === 1) {
                    // LÓGICA DE PAGAMENTO PARCIAL
                    const debtToUpdateId = selectedCheckboxes[0].dataset.debtId;
                    const debtToUpdate = transactions.find(t => t.id === debtToUpdateId);
        
                    if (debtToUpdate && creditAvailable > 0) {
                        const newDebtValue = debtToUpdate.valor - creditAvailable;
                        
                        // Atualiza a dívida original com o valor restante
                        await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', debtToUpdateId), {
                            valor: newDebtValue
                        });
                        debtToUpdate.valor = newDebtValue;
                        
                        // Zera o crédito da pessoa
                        settings.thirdPartyCredits[personName] = 0;
                        await saveSettings();
                    }
        
                } else {
                    // LÓGICA DE PAGAMENTO INTEGRAL (EXISTENTE)
                    let totalApplied = 0;
                    const debtsToSettle = [];
                    selectedCheckboxes.forEach(cb => {
                        const transaction = transactions.find(t => t.id === cb.dataset.debtId);
                        if(transaction) {
                            totalApplied += transaction.valor;
                            debtsToSettle.push(transaction.id);
                        }
                    });
        
                    for (const debtId of debtsToSettle) {
                        await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', debtId), { thirdPartyPaid: true });
                        const localTransaction = transactions.find(t => t.id === debtId);
                        if(localTransaction) localTransaction.thirdPartyPaid = true;
                    }
                    
                    settings.thirdPartyCredits[personName] -= totalApplied;
                    await saveSettings();
                }
                
                closeModal();
                updateUIForMonth();
            };
        
            openModal(modal);
        }
// main.js

// function renderThirdPartyView() {
//     const container = document.getElementById('terceiros-view-content');
//     const emptyState = document.getElementById('empty-state-terceiros');
//     if (!container || !emptyState) return;

//     container.innerHTML = '';

//     const allTransactionsWithThirdParty = transactions.filter(t => t.thirdParty && t.thirdParty.trim() !== '');
//     const groupedByName = allTransactionsWithThirdParty.reduce((acc, t) => {
//         const name = t.thirdParty.trim();
//         if (!acc[name]) acc[name] = [];
//         acc[name].push(t);
//         return acc;
//     }, {});

//     if (Object.keys(groupedByName).length === 0) {
//         emptyState.classList.remove('hidden');
//         container.classList.add('hidden');
//         return;
//     }

//     emptyState.classList.add('hidden');
//     container.classList.remove('hidden');
//     container.classList.add('space-y-4');

//     for (const name in groupedByName) {
//         const allPersonTransactions = groupedByName[name];
        
//         const personCredit = settings.thirdPartyCredits[name] || 0;
//         const totalUnpaidDebtGlobal = allPersonTransactions.filter(t => !t.thirdPartyPaid && !t.isCreditRecord).reduce((sum, t) => sum + t.valor, 0);
        
//         const personTransactionsForMonth = allPersonTransactions.filter(t => {
//              const tDate = new Date(t.data + 'T00:00:00');
//              return tDate.getFullYear() === currentDate.getFullYear() && tDate.getMonth() === currentDate.getMonth();
//         });

//         const totalDebitosNoMes = personTransactionsForMonth.filter(t => !t.isCreditRecord).reduce((sum, t) => sum + t.valor, 0);
//         const pendenteNoMes = personTransactionsForMonth.filter(t => !t.isCreditRecord && !t.thirdPartyPaid).reduce((sum, t) => sum + t.valor, 0);

//         const creditRecordsForMonth = personTransactionsForMonth.filter(t => t.isCreditRecord);
//         const totalCreditInMonth = creditRecordsForMonth.reduce((sum, t) => sum + t.valor, 0);
        
//         // AJUSTE 1: Cálculos para o tooltip detalhado
//         const totalCreditEverReceived = allPersonTransactions.filter(t => t.isCreditRecord).reduce((sum, t) => sum + t.valor, 0);
//         const creditoUtilizado = totalCreditEverReceived - personCredit;

//         let creditButtonHTML = '';
//         if (personCredit > 0 && totalUnpaidDebtGlobal > 0) {
//             creditButtonHTML = `<div class="mt-4"><button class="apply-credit-btn w-full bg-green-100 text-green-700 font-bold py-2 px-3 rounded-lg text-sm hover:bg-green-200" data-person-name="${name}" title="Aplicar crédito disponível">
//                 <i class="fa-solid fa-magic-wand-sparkles mr-2"></i>Aplicar Crédito Disponível (${formatCurrency(personCredit)})
//             </button></div>`;
//         }

//         const debtRecordsForMonth = personTransactionsForMonth.filter(t => !t.isCreditRecord);
//         const groupedDebtsByCard = debtRecordsForMonth.reduce((acc, t) => {
//             const cardId = t.cartaoId || 'geral';
//             if (!acc[cardId]) acc[cardId] = [];
//             acc[cardId].push(t);
//             return acc;
//         }, {});

//         const cardElement = document.createElement('div');
//         cardElement.className = 'bg-white p-4 sm:p-5 rounded-xl shadow-md transition-all duration-300';
//         cardElement.dataset.personName = name;
        
//         let tabsHTML = `<div class="p-1 bg-gray-100 rounded-lg flex space-x-1">`;
//         tabsHTML += `<button data-tab-id="resumo" class="third-party-tab-btn flex-1 whitespace-nowrap py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 bg-white text-blue-600 shadow-sm">Resumo</button>`;
//         if (creditRecordsForMonth.length > 0) {
//              tabsHTML += `<button data-tab-id="creditos" class="third-party-tab-btn flex-1 whitespace-nowrap py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 text-gray-500">Créditos</button>`;
//         }
//         for (const cardId in groupedDebtsByCard) {
//             if (groupedDebtsByCard[cardId].length > 0) {
//                 const cardInfo = settings.cartoes.find(c => c.id == cardId);
//                 const tabName = cardInfo ? cardInfo.name : 'Outras';
//                 tabsHTML += `<button data-tab-id="${cardId}" class="third-party-tab-btn flex-1 whitespace-nowrap py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 text-gray-500">${tabName}</button>`;
//             }
//         }
//         tabsHTML += '</div>';

//         let tabsContentHTML = '';
//         const createListHTML = (transactionsToList, isCreditList = false) => {
//             if (transactionsToList.length === 0) return '<p class="text-center text-gray-400 py-4">Nenhuma transação neste grupo.</p>';
            
//             return transactionsToList.map(t => {
//                 let desc = t.descricao;
//                 if (t.installments) {
//                    desc += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total})</span>`;
//                 }

//                 // AJUSTE 1: HTML para o tooltip detalhado e customizado
//                 let creditInfoIconHTML = '';
//                 if (isCreditList && totalCreditEverReceived > 0) {
//                     const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
//                     const creditTooltipText = `Recebido em ${monthName}: ${formatCurrency(totalCreditInMonth)}\nUtilizado (Geral): ${formatCurrency(creditoUtilizado)}\nSaldo de Crédito: ${formatCurrency(personCredit)}`;
//                     creditInfoIconHTML = `
//                         <div class="relative group">
//                             <i class="fa-solid fa-circle-info text-blue-400 ml-2"></i>
//                             <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs bg-gray-800 text-white text-xs rounded-lg p-2 text-center whitespace-pre-line opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
//                                 ${creditTooltipText}
//                                 <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
//                             </div>
//                         </div>
//                     `;
//                 }

//                 return `
//                 <li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 ${t.thirdPartyPaid && !isCreditList ? 'opacity-50' : ''}">
//                     <div class="flex items-center gap-1">
//                         ${!isCreditList ? `<input type="checkbox" class="quit-third-party-debt-check h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-debt-id="${t.id}" ${t.thirdPartyPaid ? 'checked' : ''}>` : '<div class="w-4 h-4 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-hand-holding-dollar text-green-500"></i></div>'}
//                         <div class="ml-2">
//                             <p class="font-medium ${isCreditList ? 'text-green-600' : 'text-gray-800'} ${t.thirdPartyPaid && !isCreditList ? 'line-through' : ''} flex items-center">${desc}${creditInfoIconHTML}</p>
//                             <p class="text-xs text-gray-500">${new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
//                         </div>
//                     </div>
//                     <div class="flex items-center gap-3 flex-shrink-0">
//                         <span class="font-mono font-semibold ${isCreditList ? 'text-green-600' : 'text-gray-700'}">${formatCurrency(t.valor)}</span>
//                         ${isCreditList ? `
//                         <button class="edit-credit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}" title="Editar Crédito"><i class="fa-solid fa-pen-to-square"></i></button>
//                         <button class="delete-credit-btn text-gray-400 hover:text-red-500" data-id="${t.id}" title="Excluir Crédito"><i class="fa-solid fa-trash-can"></i></button>
//                         ` : `
//                         <button class="edit-debt-btn text-gray-400 hover:text-blue-500" data-debt-id="${t.id}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
//                         <button class="delete-debt-btn text-gray-400 hover:text-red-500" data-debt-id="${t.id}" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
//                         `}
//                     </div>
//                 </li>`;
//             }).join('');
//         };

//         let resumoContentHTML = '<div data-tab-content-id="resumo" class="tab-content space-y-5">';
//         for (const cardId in groupedDebtsByCard) {
//             const cardTransactions = groupedDebtsByCard[cardId];
//             if (cardTransactions.length > 0) {
//                  const cardInfo = settings.cartoes.find(c => c.id == cardId);
//                  const subTotal = cardTransactions.reduce((sum, t) => sum + t.valor, 0);
//                  const cardTitle = cardInfo ? `Fatura ${cardInfo.name}` : 'Outras Contas';
//                  resumoContentHTML += `<div><div class="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg"><h4 class="font-semibold text-gray-800">${cardTitle}</h4></div><ul class="p-3 border-l border-r border-b rounded-b-lg">${createListHTML(cardTransactions)}</ul><p class="text-right font-bold text-gray-800 pr-2 pt-1">Subtotal: ${formatCurrency(subTotal)}</p></div>`;
//             }
//         }
//         resumoContentHTML += '</div>';
//         tabsContentHTML += resumoContentHTML;
        
//         if (creditRecordsForMonth.length > 0) {
//              tabsContentHTML += `<div data-tab-content-id="creditos" class="tab-content hidden"><ul class="space-y-1">${createListHTML(creditRecordsForMonth, true)}</ul></div>`;
//         }

//         for (const cardId in groupedDebtsByCard) {
//             tabsContentHTML += `<div data-tab-content-id="${cardId}" class="tab-content hidden"><ul class="space-y-1">${createListHTML(groupedDebtsByCard[cardId])}</ul></div>`;
//         }
        
//         // AJUSTE 2: NOVO LAYOUT 2x2 PARA OS VALORES
//         cardElement.innerHTML = `
//             <div class="flex justify-between items-center pb-4 border-b">
//                 <h3 class="text-xl font-bold text-gray-800 truncate" title="${name}">${name}</h3>
//                 <div class="flex items-center gap-1 flex-shrink-0">
//                     <button class="share-summary-btn text-green-500 hover:text-green-600 p-2 rounded-full hover:bg-gray-100" title="Compartilhar Resumo de ${name}" data-person-name="${name}"><i class="fa-brands fa-whatsapp fa-lg"></i></button>
//                     <button class="register-payment-btn text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100" title="Registrar Pagamento de ${name} (Lançar Crédito)" data-person-name="${name}"><i class="fa-solid fa-hand-holding-dollar fa-lg"></i></button>
//                     <button class="details-toggle-btn text-gray-500 p-2 rounded-full hover:bg-gray-100" title="Ver detalhes"><i class="fa-solid fa-chevron-down details-chevron transition-transform"></i></button>
//                 </div>
//             </div>

//             <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-center pt-4">
//                 <div>
//                     <span class="text-xs text-gray-500 block">Total no Mês</span>
//                     <p class="font-semibold text-gray-700 text-base">${formatCurrency(totalDebitosNoMes)}</p>
//                 </div>
//                 <div>
//                     <span class="text-xs text-gray-500 block">Pendente (Mês)</span>
//                     <p class="font-bold text-lg ${pendenteNoMes > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(pendenteNoMes)}</p>
//                 </div>
//                 <div>
//                     <span class="text-xs text-gray-500 block">Total Aberto</span>
//                     <p class="font-semibold text-red-600 text-base">${formatCurrency(totalUnpaidDebtGlobal)}</p>
//                 </div>
//                 <div>
//                     <span class="text-xs text-gray-500 block">Crédito Geral</span>
//                     <p class="font-semibold text-green-600 text-base">${formatCurrency(personCredit)}</p>
//                 </div>
//             </div>
            
//             ${creditButtonHTML}

//             <div class="third-party-details hidden mt-4 border-t pt-4">
//                 ${tabsHTML}
//                 <div class="mt-4">
//                     ${tabsContentHTML}
//                 </div>
//             </div>
//         `;
//         container.appendChild(cardElement);
//     }
// }
// function renderThirdPartyView() {
//     const container = document.getElementById('terceiros-view-content');
//     const emptyState = document.getElementById('empty-state-terceiros');
//     if (!container || !emptyState) return;

//     container.innerHTML = '';

//     const allTransactionsWithThirdParty = transactions.filter(t => t.thirdParty && t.thirdParty.trim() !== '');
//     const groupedByName = allTransactionsWithThirdParty.reduce((acc, t) => {
//         const name = t.thirdParty.trim();
//         if (!acc[name]) acc[name] = [];
//         acc[name].push(t);
//         return acc;
//     }, {});

//     if (Object.keys(groupedByName).length === 0) {
//         emptyState.classList.remove('hidden');
//         container.classList.add('hidden');
//         return;
//     }

//     emptyState.classList.add('hidden');
//     container.classList.remove('hidden');
//     container.classList.add('space-y-4');

//     for (const name in groupedByName) {
//         const allPersonTransactions = groupedByName[name];
        
//         const personCredit = settings.thirdPartyCredits[name] || 0;
//         const totalUnpaidDebtGlobal = allPersonTransactions
//             .filter(t => !t.thirdPartyPaid && !t.isCreditRecord)
//             .reduce((sum, t) => sum + t.valor, 0);
        
//         const personTransactionsForMonth = allPersonTransactions.filter(t => {
//              const tDate = new Date(t.data + 'T00:00:00');
//              return tDate.getFullYear() === currentDate.getFullYear() && tDate.getMonth() === currentDate.getMonth();
//         });

//         const totalDebitosNoMes = personTransactionsForMonth
//             .filter(t => !t.isCreditRecord)
//             .reduce((sum, t) => sum + t.valor, 0);

//         const pendenteNoMes = personTransactionsForMonth
//             .filter(t => !t.isCreditRecord && !t.thirdPartyPaid)
//             .reduce((sum, t) => sum + t.valor, 0);

//         let creditButtonHTML = '';
//         if (personCredit > 0 && totalUnpaidDebtGlobal > 0) {
//             creditButtonHTML = `
//                 <button class="apply-credit-btn bg-green-100 text-green-700 font-bold py-1 px-3 rounded-full text-sm hover:bg-green-200" data-person-name="${name}" title="Aplicar crédito disponível">
//                     <i class="fa-solid fa-magic-wand-sparkles mr-2"></i>Aplicar Crédito
//                 </button>
//             `;
//         }

//         const creditRecordsForMonth = personTransactionsForMonth.filter(t => t.isCreditRecord);
//         const debtRecordsForMonth = personTransactionsForMonth.filter(t => !t.isCreditRecord);
//         const groupedDebtsByCard = debtRecordsForMonth.reduce((acc, t) => {
//             const cardId = t.cartaoId || 'geral';
//             if (!acc[cardId]) acc[cardId] = [];
//             acc[cardId].push(t);
//             return acc;
//         }, {});

//         const cardElement = document.createElement('div');
//         cardElement.className = 'bg-white p-4 sm:p-5 rounded-xl shadow-md transition-all duration-300';
//         cardElement.dataset.personName = name;
        
//         let tabsHTML = `<div class="p-1 bg-gray-100 rounded-lg flex space-x-1">`;
//         tabsHTML += `<button data-tab-id="resumo" class="third-party-tab-btn flex-1 whitespace-nowrap py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 bg-white text-blue-600 shadow-sm">Resumo</button>`;
//         if (creditRecordsForMonth.length > 0) {
//              tabsHTML += `<button data-tab-id="creditos" class="third-party-tab-btn flex-1 whitespace-nowrap py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 text-gray-500">Créditos</button>`;
//         }
//         for (const cardId in groupedDebtsByCard) {
//             if (groupedDebtsByCard[cardId].length > 0) {
//                 const cardInfo = settings.cartoes.find(c => c.id == cardId);
//                 const tabName = cardInfo ? cardInfo.name : 'Outras';
//                 tabsHTML += `<button data-tab-id="${cardId}" class="third-party-tab-btn flex-1 whitespace-nowrap py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 text-gray-500">${tabName}</button>`;
//             }
//         }
//         tabsHTML += '</div>';

//         let tabsContentHTML = '';
//         const createListHTML = (transactionsToList, isCreditList = false) => {
//             if (transactionsToList.length === 0) return '<p class="text-center text-gray-400 py-4">Nenhuma transação neste grupo.</p>';
            
//             return transactionsToList.map(t => {
//                 let desc = t.descricao;
//                 if (t.installments) {
//                    desc += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total})</span>`;
//                 }
//                 return `
//                 <li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 ${t.thirdPartyPaid && !isCreditList ? 'opacity-50' : ''}">
//                     <div class="flex items-center gap-3">
//                         ${!isCreditList ? `<input type="checkbox" class="quit-third-party-debt-check h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-debt-id="${t.id}" ${t.thirdPartyPaid ? 'checked' : ''}>` : '<div class="w-4 h-4 flex items-center justify-center"><i class="fa-solid fa-hand-holding-dollar text-green-500"></i></div>'}
//                         <div>
//                             <p class="font-medium ${t.thirdPartyPaid && !isCreditList ? 'line-through' : ''} ${isCreditList ? 'text-green-600' : 'text-gray-800'}">${desc}</p>
//                             <p class="text-xs text-gray-500">${new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
//                         </div>
//                     </div>
//                     <div class="flex items-center gap-3">
//                         <span class="font-mono font-semibold ${isCreditList ? 'text-green-600' : 'text-gray-700'}">${formatCurrency(t.valor)}</span>
//                         ${isCreditList ? `
//                         <button class="edit-credit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}" title="Editar Crédito"><i class="fa-solid fa-pen-to-square"></i></button>
//                         <button class="delete-credit-btn text-gray-400 hover:text-red-500" data-id="${t.id}" title="Excluir Crédito"><i class="fa-solid fa-trash-can"></i></button>
//                         ` : `
//                         <button class="edit-debt-btn text-gray-400 hover:text-blue-500" data-debt-id="${t.id}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
//                         <button class="delete-debt-btn text-gray-400 hover:text-red-500" data-debt-id="${t.id}" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
//                         `}
//                     </div>
//                 </li>`;
//             }).join('');
//         };

//         let resumoContentHTML = '<div data-tab-content-id="resumo" class="tab-content space-y-5">';
//         for (const cardId in groupedDebtsByCard) {
//             const cardTransactions = groupedDebtsByCard[cardId];
//             if (cardTransactions.length > 0) {
//                  const cardInfo = settings.cartoes.find(c => c.id == cardId);
//                  const subTotal = cardTransactions.reduce((sum, t) => sum + t.valor, 0);
//                  const cardTitle = cardInfo ? `Fatura ${cardInfo.name}` : 'Outras Contas';
//                  resumoContentHTML += `<div><div class="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg"><h4 class="font-semibold text-gray-800">${cardTitle}</h4></div><ul class="p-3 border-l border-r border-b rounded-b-lg">${createListHTML(cardTransactions)}</ul><p class="text-right font-bold text-gray-800 pr-2 pt-1">Subtotal: ${formatCurrency(subTotal)}</p></div>`;
//             }
//         }
//         resumoContentHTML += '</div>';
//         tabsContentHTML += resumoContentHTML;
        
//         if (creditRecordsForMonth.length > 0) {
//              tabsContentHTML += `<div data-tab-content-id="creditos" class="tab-content hidden"><ul class="space-y-1">${createListHTML(creditRecordsForMonth, true)}</ul></div>`;
//         }

//         for (const cardId in groupedDebtsByCard) {
//             tabsContentHTML += `<div data-tab-content-id="${cardId}" class="tab-content hidden"><ul class="space-y-1">${createListHTML(groupedDebtsByCard[cardId])}</ul></div>`;
//         }

//         // --- INÍCIO DA CORREÇÃO DE LAYOUT ---
//         cardElement.innerHTML = `
//             <div class="details-toggle-btn cursor-pointer">
//                 <div class="flex justify-between items-start">
//                     <div class="flex items-center gap-3">
//                         <h3 class="text-lg font-bold text-gray-900">${name}</h3>
//                         <div class="flex items-center gap-2">
//                             <button class="share-summary-btn text-green-500 hover:text-green-600" title="Compartilhar Resumo de ${name}" data-person-name="${name}"><i class="fa-brands fa-whatsapp fa-lg"></i></button>
//                             <button class="register-payment-btn text-blue-500 hover:text-blue-600" title="Registrar Pagamento de ${name} (Lançar Crédito)" data-person-name="${name}"><i class="fa-solid fa-hand-holding-dollar fa-lg"></i></button>
//                         </div>
//                     </div>
//                     <div class="text-right flex-shrink-0 flex items-center gap-4">
//                         <div>
//                             <p class="font-semibold text-gray-700">${formatCurrency(totalDebitosNoMes)}</p>
//                             <span class="text-xs text-gray-500">Total no Mês</span>
//                         </div>
//                         <div>
//                             <p class="font-bold text-xl ${pendenteNoMes > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(pendenteNoMes)}</p>
//                             <span class="text-sm text-gray-500">Pendente</span>
//                         </div>
//                         <i class="fa-solid fa-chevron-down details-chevron ml-2 transition-transform"></i>
//                     </div>
//                 </div>
//             </div>

//             <div class="text-xs text-gray-500 mt-2 border-t pt-2 flex flex-wrap justify-between items-center gap-2">
//                 <div>
//                     <span>Total em Aberto (Geral): <strong class="text-red-600">${formatCurrency(totalUnpaidDebtGlobal)}</strong></span>
//                     <span class="ml-4">Crédito (Geral): <strong class="text-green-600">${formatCurrency(personCredit)}</strong></span>
//                 </div>
//                 ${creditButtonHTML}
//             </div>

//              <div class="third-party-details hidden mt-4 pt-4 border-t border-gray-200">
//                 ${tabsHTML}
//                 <div class="mt-4">
//                     ${tabsContentHTML}
//                 </div>
//             </div>
//         `;
//         // --- FIM DA CORREÇÃO DE LAYOUT ---
//         container.appendChild(cardElement);
//     }
// }
async function recalculateAllThirdPartyCredits() {
    console.log("Iniciando recálculo de todos os créditos de terceiros...");
    
    // Zera os créditos atuais para começar do zero
    settings.thirdPartyCredits = {};

    // Filtra todas as transações que são registros de crédito
    const creditTransactions = transactions.filter(t => t.isCreditRecord === true);

    if (creditTransactions.length === 0) {
        alert("Nenhuma transação de crédito encontrada para recalcular.");
        return;
    }

    // Soma os valores para cada pessoa
    creditTransactions.forEach(t => {
        const personName = t.thirdParty;
        if (!settings.thirdPartyCredits[personName]) {
            settings.thirdPartyCredits[personName] = 0;
        }
        settings.thirdPartyCredits[personName] += t.valor;
    });

    // Salva as novas configurações no banco de dados
    await saveSettings();

    // Atualiza a interface do usuário para refletir a mudança
    updateUIForMonth();

    console.log("Recálculo de créditos concluído!", settings.thirdPartyCredits);
    alert("Todos os saldos de crédito de terceiros foram recalculados e corrigidos com sucesso!");
}
// function renderThirdPartyView() {
//     const container = document.getElementById('terceiros-view-content');
//     const emptyState = document.getElementById('empty-state-terceiros');
//     if (!container || !emptyState) return;

//     container.innerHTML = '';

//     const allTransactionsWithThirdParty = transactions.filter(t => t.thirdParty && t.thirdParty.trim() !== '');
//     const groupedByName = allTransactionsWithThirdParty.reduce((acc, t) => {
//         const name = t.thirdParty.trim();
//         if (!acc[name]) acc[name] = [];
//         acc[name].push(t);
//         return acc;
//     }, {});

//     if (Object.keys(groupedByName).length === 0) {
//         emptyState.classList.remove('hidden');
//         container.classList.add('hidden');
//         return;
//     }

//     emptyState.classList.add('hidden');
//     container.classList.remove('hidden');
//     container.classList.add('space-y-4');

//     for (const name in groupedByName) {
//         const allPersonTransactions = groupedByName[name];
        
//         // --- INÍCIO DA NOVA LÓGICA FIFO PARA IDENTIFICAR CRÉDITOS UTILIZADOS ---
//         const allCreditRecords = allPersonTransactions
//             .filter(t => t.isCreditRecord)
//             .sort((a, b) => new Date(a.data) - new Date(b.data) || a.valor - b.valor); // Ordena por data (mais antigo primeiro)

//         const totalCreditEverReceived = allCreditRecords.reduce((sum, t) => sum + t.valor, 0);
//         const personCredit = settings.thirdPartyCredits[name] || 0;
//         let cumulativeCreditUsed = totalCreditEverReceived - personCredit;

//         const lockedCreditIds = new Set();
//         for (const credit of allCreditRecords) {
//             // Se o total de crédito usado for maior que um valor mínimo (para evitar problemas com ponto flutuante)
//             if (cumulativeCreditUsed > 0.01) {
//                 lockedCreditIds.add(credit.id);
//                 cumulativeCreditUsed -= credit.valor;
//             } else {
//                 break; // Se não há mais crédito usado, os registros restantes estão livres.
//             }
//         }
//         // --- FIM DA NOVA LÓGICA ---

//         const totalUnpaidDebtGlobal = allPersonTransactions.filter(t => !t.thirdPartyPaid && !t.isCreditRecord).reduce((sum, t) => sum + t.valor, 0);
        
//         const personTransactionsForMonth = allPersonTransactions.filter(t => {
//              const tDate = new Date(t.data + 'T00:00:00');
//              return tDate.getFullYear() === currentDate.getFullYear() && tDate.getMonth() === currentDate.getMonth();
//         });

//         const totalDebitosNoMes = personTransactionsForMonth.filter(t => !t.isCreditRecord).reduce((sum, t) => sum + t.valor, 0);
//         const pendenteNoMes = personTransactionsForMonth.filter(t => !t.isCreditRecord && !t.thirdPartyPaid).reduce((sum, t) => sum + t.valor, 0);

//         const creditRecordsForMonth = personTransactionsForMonth.filter(t => t.isCreditRecord);
//         const totalCreditInMonth = creditRecordsForMonth.reduce((sum, t) => sum + t.valor, 0);
        
//         const creditoUtilizado = totalCreditEverReceived - personCredit;

//         let creditButtonHTML = '';
//         if (personCredit > 0 && totalUnpaidDebtGlobal > 0) {
//             creditButtonHTML = `<div class="mt-4"><button class="apply-credit-btn w-full bg-green-100 text-green-700 font-bold py-2 px-3 rounded-lg text-sm hover:bg-green-200" data-person-name="${name}" title="Aplicar crédito disponível">
//                 <i class="fa-solid fa-magic-wand-sparkles mr-2"></i>Aplicar Crédito Disponível (${formatCurrency(personCredit)})
//             </button></div>`;
//         }

//         const debtRecordsForMonth = personTransactionsForMonth.filter(t => !t.isCreditRecord);
//         const groupedDebtsByCard = debtRecordsForMonth.reduce((acc, t) => {
//             const cardId = t.cartaoId || 'geral';
//             if (!acc[cardId]) acc[cardId] = [];
//             acc[cardId].push(t);
//             return acc;
//         }, {});

//         const cardElement = document.createElement('div');
//         cardElement.className = 'bg-white p-4 sm:p-5 rounded-xl shadow-md transition-all duration-300';
//         cardElement.dataset.personName = name;
        
//         let tabsHTML = `<div class="p-1 bg-gray-100 rounded-lg flex flex-nowrap space-x-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">`;
//         tabsHTML += `<button data-tab-id="resumo" class="third-party-tab-btn whitespace-nowrap py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 bg-white text-blue-600 shadow-sm">Resumo</button>`;
//         if (creditRecordsForMonth.length > 0) {
//              tabsHTML += `<button data-tab-id="creditos" class="third-party-tab-btn whitespace-nowrap py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 text-gray-500">Créditos</button>`;
//         }
//         for (const cardId in groupedDebtsByCard) {
//             if (groupedDebtsByCard[cardId].length > 0) {
//                 const cardInfo = settings.cartoes.find(c => c.id == cardId);
//                 const tabName = cardInfo ? cardInfo.name : 'Outras';
//                 tabsHTML += `<button data-tab-id="${cardId}" class="third-party-tab-btn whitespace-nowrap py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 text-gray-500">${tabName}</button>`;
//             }
//         }
//         tabsHTML += '</div>';

//         let tabsContentHTML = '';
//         const createListHTML = (transactionsToList, isCreditList = false, lockedIds = new Set()) => {
//             if (transactionsToList.length === 0) return '<p class="text-center text-gray-400 py-4">Nenhuma transação neste grupo.</p>';
            
//             return transactionsToList.map(t => {
//                 let desc = t.descricao;
//                 if (t.installments) {
//                    desc += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total})</span>`;
//                 }

//                 const isThisCreditRecordLocked = isCreditList && lockedIds.has(t.id);
                
//                 let creditInfoIconHTML = '';
//                 if (isCreditList && totalCreditEverReceived > 0) {
//                     const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
//                     const creditTooltipText = `Recebido em ${monthName}: ${formatCurrency(totalCreditInMonth)}\nUtilizado (Geral): ${formatCurrency(creditoUtilizado)}\nSaldo de Crédito: ${formatCurrency(personCredit)}`;
//                     creditInfoIconHTML = `
//                         <div class="relative group">
//                             <i class="fa-solid fa-circle-info text-blue-400 ml-2 cursor-pointer"></i>
//                             <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs bg-gray-800 text-white text-xs rounded-lg p-2 text-center whitespace-pre-line opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
//                                 ${creditTooltipText}
//                                 <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
//                             </div>
//                         </div>
//                     `;
//                 }

//                 return `
//                 <li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 ${t.thirdPartyPaid && !isCreditList ? 'opacity-50' : ''} ${isThisCreditRecordLocked ? 'opacity-50' : ''}">
//                     <div class="flex items-center gap-1">
//                         ${!isCreditList ? `<input type="checkbox" class="quit-third-party-debt-check h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-debt-id="${t.id}" ${t.thirdPartyPaid ? 'checked' : ''}>` : '<div class="w-4 h-4 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-hand-holding-dollar text-green-500"></i></div>'}
//                         <div class="ml-2">
//                             <p class="font-medium ${isCreditList ? 'text-green-600' : 'text-gray-800'} ${(t.thirdPartyPaid && !isCreditList) || isThisCreditRecordLocked ? 'line-through' : ''} flex items-center">${desc}${creditInfoIconHTML}</p>
//                             <p class="text-xs text-gray-500">${new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
//                         </div>
//                     </div>
//                     <div class="flex items-center gap-3 flex-shrink-0">
//                         <span class="font-mono font-semibold ${isCreditList ? 'text-green-600' : 'text-gray-700'}">${formatCurrency(t.valor)}</span>
//                         ${isCreditList ? `
//                         <button class="edit-credit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}" title="Editar Crédito" ${isThisCreditRecordLocked ? 'disabled' : ''}><i class="fa-solid fa-pen-to-square"></i></button>
//                         <button class="delete-credit-btn text-gray-400 hover:text-red-500" data-id="${t.id}" title="Excluir Crédito" ${isThisCreditRecordLocked ? 'disabled' : ''}><i class="fa-solid fa-trash-can"></i></button>
//                         ` : `
//                         <button class="edit-debt-btn text-gray-400 hover:text-blue-500" data-debt-id="${t.id}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
//                         <button class="delete-debt-btn text-gray-400 hover:text-red-500" data-debt-id="${t.id}" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
//                         `}
//                     </div>
//                 </li>`;
//             }).join('');
//         };

//         let resumoContentHTML = '<div data-tab-content-id="resumo" class="tab-content space-y-5">';
//         for (const cardId in groupedDebtsByCard) {
//             const cardTransactions = groupedDebtsByCard[cardId];
//             if (cardTransactions.length > 0) {
//                  const cardInfo = settings.cartoes.find(c => c.id == cardId);
//                  const subTotal = cardTransactions.reduce((sum, t) => sum + t.valor, 0);
//                  const cardTitle = cardInfo ? `Fatura ${cardInfo.name}` : 'Outras Contas';
//                  resumoContentHTML += `<div><div class="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg"><h4 class="font-semibold text-gray-800">${cardTitle}</h4></div><ul class="p-3 border-l border-r border-b rounded-b-lg">${createListHTML(cardTransactions)}</ul><p class="text-right font-bold text-gray-800 pr-2 pt-1">Subtotal: ${formatCurrency(subTotal)}</p></div>`;
//             }
//         }
//         resumoContentHTML += '</div>';
//         tabsContentHTML += resumoContentHTML;
        
//         if (creditRecordsForMonth.length > 0) {
//              tabsContentHTML += `<div data-tab-content-id="creditos" class="tab-content hidden"><ul class="space-y-1">${createListHTML(creditRecordsForMonth, true, lockedCreditIds)}</ul></div>`;
//         }

//         for (const cardId in groupedDebtsByCard) {
//             tabsContentHTML += `<div data-tab-content-id="${cardId}" class="tab-content hidden"><ul class="space-y-1">${createListHTML(groupedDebtsByCard[cardId], false, lockedCreditIds)}</ul></div>`;
//         }
        
//         cardElement.innerHTML = `
//             <div class="flex justify-between items-center pb-4 border-b">
//                 <h3 class="text-xl font-bold text-gray-800 truncate" title="${name}">${name}</h3>
               
//                 <div class="flex items-center gap-1 flex-shrink-0">
//                     <button class="share-summary-btn text-green-500 hover:text-green-600 p-2 rounded-full hover:bg-gray-100" title="Compartilhar Resumo de ${name}" data-person-name="${name}">
//                         <i class="fa-brands fa-whatsapp fa-lg"></i>
//                     </button>
//                     <button class="add-third-party-debt-btn text-purple-500 hover:text-purple-600 p-2 rounded-full hover:bg-gray-100" title="Adicionar Dívida para ${name}" data-person-name="${name}">
//                         <i class="fa-solid fa-comment-dollar fa-lg"></i>
//                     </button>
//                     <button class="register-payment-btn text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100" title="Registrar Pagamento de ${name} (Lançar Crédito)" data-person-name="${name}">
//                         <i class="fa-solid fa-hand-holding-dollar fa-lg"></i>
//                     </button>
//                     <button class="details-toggle-btn text-gray-500 p-2 rounded-full hover:bg-gray-100" title="Ver detalhes">
//                         <i class="fa-solid fa-chevron-down details-chevron transition-transform"></i>
//                     </button>
//                 </div>
//             </div>

//             <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-center pt-4">
//                 <div>
//                     <span class="text-xs text-gray-500 block">Total no Mês</span>
//                     <p class="font-semibold text-gray-700 text-sm">${formatCurrency(totalDebitosNoMes)}</p>
//                 </div>
//                 <div>
//                     <span class="text-xs text-gray-500 block">Pendente (Mês)</span>
//                     <p class="font-bold text-base ${pendenteNoMes > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(pendenteNoMes)}</p>
//                 </div>
//                 <div>
//                     <span class="text-xs text-gray-500 block">Crédito Geral</span>
//                     <p class="font-semibold text-green-600 text-sm">${formatCurrency(personCredit)}</p>
//                 </div>
//             </div>
            
//             ${creditButtonHTML}

//             <div class="third-party-details hidden mt-4 border-t pt-4">
//                 ${tabsHTML}
//                 <div class="mt-4">
//                     ${tabsContentHTML}
//                 </div>
//             </div>
//         `;
//         container.appendChild(cardElement);
//     }
// }

function renderThirdPartyView() {
    const container = document.getElementById('terceiros-view-content');
    const emptyState = document.getElementById('empty-state-terceiros');
    if (!container || !emptyState) return;

    container.innerHTML = '';

    // AJUSTE PRINCIPAL: Filtra as transações pelo mês corrente ANTES de agrupar.
    const monthTransactions = getTransactionsForMonth(currentDate);
    const transactionsWithThirdPartyInMonth = monthTransactions.filter(t => t.thirdParty && t.thirdParty.trim() !== '');

    const groupedByNameForMonth = transactionsWithThirdPartyInMonth.reduce((acc, t) => {
        const name = t.thirdParty.trim();
        if (!acc[name]) acc[name] = [];
        acc[name].push(t);
        return acc;
    }, {});

    if (Object.keys(groupedByNameForMonth).length === 0) {
        emptyState.classList.remove('hidden');
        container.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    container.classList.add('space-y-4');

    // O loop agora itera apenas sobre pessoas com atividade no mês.
    for (const name in groupedByNameForMonth) {
        // Busca TODAS as transações da pessoa para calcular saldos globais.
        const allPersonTransactions = transactions.filter(t => t.thirdParty === name);
        // Usa as transações do mês (já filtradas) para os detalhes do mês.
        const personTransactionsForMonth = groupedByNameForMonth[name];

        // --- LÓGICA FIFO PARA IDENTIFICAR CRÉDITOS UTILIZADOS (Mantida) ---
        const allCreditRecords = allPersonTransactions
            .filter(t => t.isCreditRecord)
            .sort((a, b) => new Date(a.data) - new Date(b.data) || a.valor - b.valor);

        const totalCreditEverReceived = allCreditRecords.reduce((sum, t) => sum + t.valor, 0);
        const personCredit = settings.thirdPartyCredits[name] || 0;
        let cumulativeCreditUsed = totalCreditEverReceived - personCredit;

        const lockedCreditIds = new Set();
        for (const credit of allCreditRecords) {
            if (cumulativeCreditUsed > 0.01) {
                lockedCreditIds.add(credit.id);
                cumulativeCreditUsed -= credit.valor;
            } else {
                break;
            }
        }
        // --- FIM DA LÓGICA FIFO ---

        // Cálculos de saldo (globais e mensais)
        const totalUnpaidDebtGlobal = allPersonTransactions.filter(t => !t.thirdPartyPaid && !t.isCreditRecord).reduce((sum, t) => sum + t.valor, 0);
        const totalDebitosNoMes = personTransactionsForMonth.filter(t => !t.isCreditRecord).reduce((sum, t) => sum + t.valor, 0);
        const pendenteNoMes = personTransactionsForMonth.filter(t => !t.isCreditRecord && !t.thirdPartyPaid).reduce((sum, t) => sum + t.valor, 0);
        const creditRecordsForMonth = personTransactionsForMonth.filter(t => t.isCreditRecord);

        // O restante do código de renderização do card continua o mesmo...
        // ... (código para criar tabsHTML, tabsContentHTML, e cardElement.innerHTML) ...
        // Note que o código interno que usa as variáveis acima já está correto e não precisa de alteração.

        const totalCreditInMonth = creditRecordsForMonth.reduce((sum, t) => sum + t.valor, 0);
        const creditoUtilizado = totalCreditEverReceived - personCredit;

        let creditButtonHTML = '';
        if (personCredit > 0 && totalUnpaidDebtGlobal > 0) {
            creditButtonHTML = `<div class="mt-4"><button class="apply-credit-btn w-full bg-green-100 text-green-700 font-bold py-2 px-3 rounded-lg text-sm hover:bg-green-200" data-person-name="${name}" title="Aplicar crédito disponível">
                <i class="fa-solid fa-magic-wand-sparkles mr-2"></i>Aplicar Crédito Disponível (${formatCurrency(personCredit)})
            </button></div>`;
        }

        const debtRecordsForMonth = personTransactionsForMonth.filter(t => !t.isCreditRecord);
        const groupedDebtsByCard = debtRecordsForMonth.reduce((acc, t) => {
            const cardId = t.cartaoId || 'geral';
            if (!acc[cardId]) acc[cardId] = [];
            acc[cardId].push(t);
            return acc;
        }, {});

        const cardElement = document.createElement('div');
        cardElement.className = 'bg-white p-4 sm:p-5 rounded-xl shadow-md transition-all duration-300';
        cardElement.dataset.personName = name;
        
        let tabsHTML = `<div class="p-1 bg-gray-100 rounded-lg flex flex-nowrap space-x-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">`;
        tabsHTML += `<button data-tab-id="resumo" class="third-party-tab-btn whitespace-nowrap py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 bg-white text-blue-600 shadow-sm">Resumo</button>`;
        if (creditRecordsForMonth.length > 0) {
             tabsHTML += `<button data-tab-id="creditos" class="third-party-tab-btn whitespace-nowrap py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 text-gray-500">Créditos</button>`;
        }
        for (const cardId in groupedDebtsByCard) {
            if (groupedDebtsByCard[cardId].length > 0) {
                const cardInfo = settings.cartoes.find(c => c.id == cardId);
                const tabName = cardInfo ? cardInfo.name : 'Outras';
                tabsHTML += `<button data-tab-id="${cardId}" class="third-party-tab-btn whitespace-nowrap py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 text-gray-500">${tabName}</button>`;
            }
        }
        tabsHTML += '</div>';

        let tabsContentHTML = '';
        const createListHTML = (transactionsToList, isCreditList = false, lockedIds = new Set()) => {
            if (transactionsToList.length === 0) return '<p class="text-center text-gray-400 py-4">Nenhuma transação neste grupo.</p>';
            
            return transactionsToList.map(t => {
                let desc = t.descricao;
                if (t.installments) {
                   desc += ` <span class="text-xs font-mono text-orange-500">(${t.installments.current}/${t.installments.total})</span>`;
                }

                const isThisCreditRecordLocked = isCreditList && lockedIds.has(t.id);
                
                let creditInfoIconHTML = '';
                if (isCreditList && totalCreditEverReceived > 0) {
                    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
                    const creditTooltipText = `Recebido em ${monthName}: ${formatCurrency(totalCreditInMonth)}\nUtilizado (Geral): ${formatCurrency(creditoUtilizado)}\nSaldo de Crédito: ${formatCurrency(personCredit)}`;
                    creditInfoIconHTML = `
                        <div class="relative group">
                            <i class="fa-solid fa-circle-info text-blue-400 ml-2 cursor-pointer"></i>
                            <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs bg-gray-800 text-white text-xs rounded-lg p-2 text-center whitespace-pre-line opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                ${creditTooltipText}
                                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    `;
                }

                return `
                <li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 ${t.thirdPartyPaid && !isCreditList ? 'opacity-50' : ''} ${isThisCreditRecordLocked ? 'opacity-50' : ''}">
                    <div class="flex items-center gap-1">
                        ${!isCreditList ? `<input type="checkbox" class="quit-third-party-debt-check h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-debt-id="${t.id}" ${t.thirdPartyPaid ? 'checked' : ''}>` : '<div class="w-4 h-4 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-hand-holding-dollar text-green-500"></i></div>'}
                        <div class="ml-2">
                            <p class="font-medium ${isCreditList ? 'text-green-600' : 'text-gray-800'} ${(t.thirdPartyPaid && !isCreditList) || isThisCreditRecordLocked ? 'line-through' : ''} flex items-center">${desc}${creditInfoIconHTML}</p>
                            <p class="text-xs text-gray-500">${new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 flex-shrink-0">
                        <span class="font-mono font-semibold ${isCreditList ? 'text-green-600' : 'text-gray-700'}">${formatCurrency(t.valor)}</span>
                        ${isCreditList ? `
                        <button class="edit-credit-btn text-gray-400 hover:text-blue-500" data-id="${t.id}" title="Editar Crédito" ${isThisCreditRecordLocked ? 'disabled' : ''}><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="delete-credit-btn text-gray-400 hover:text-red-500" data-id="${t.id}" title="Excluir Crédito" ${isThisCreditRecordLocked ? 'disabled' : ''}><i class="fa-solid fa-trash-can"></i></button>
                        ` : `
                        <button class="edit-debt-btn text-gray-400 hover:text-blue-500" data-debt-id="${t.id}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="delete-debt-btn text-gray-400 hover:text-red-500" data-debt-id="${t.id}" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                        `}
                    </div>
                </li>`;
            }).join('');
        };

        let resumoContentHTML = '<div data-tab-content-id="resumo" class="tab-content space-y-5">';
        for (const cardId in groupedDebtsByCard) {
            const cardTransactions = groupedDebtsByCard[cardId];
            if (cardTransactions.length > 0) {
                 const cardInfo = settings.cartoes.find(c => c.id == cardId);
                 const subTotal = cardTransactions.reduce((sum, t) => sum + t.valor, 0);
                 const cardTitle = cardInfo ? `Fatura ${cardInfo.name}` : 'Outras Contas';
                 resumoContentHTML += `<div><div class="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg"><h4 class="font-semibold text-gray-800">${cardTitle}</h4></div><ul class="p-3 border-l border-r border-b rounded-b-lg">${createListHTML(cardTransactions, false, lockedCreditIds)}</ul><p class="text-right font-bold text-gray-800 pr-2 pt-1">Subtotal: ${formatCurrency(subTotal)}</p></div>`;
            }
        }
        resumoContentHTML += '</div>';
        tabsContentHTML += resumoContentHTML;
        
        if (creditRecordsForMonth.length > 0) {
             tabsContentHTML += `<div data-tab-content-id="creditos" class="tab-content hidden"><ul class="space-y-1">${createListHTML(creditRecordsForMonth, true, lockedCreditIds)}</ul></div>`;
        }

        for (const cardId in groupedDebtsByCard) {
             if (groupedDebtsByCard[cardId].length > 0) {
                tabsContentHTML += `<div data-tab-content-id="${cardId}" class="tab-content hidden"><ul class="space-y-1">${createListHTML(groupedDebtsByCard[cardId], false, lockedCreditIds)}</ul></div>`;
             }
        }
        
        cardElement.innerHTML = `
            <div class="flex justify-between items-center pb-4 border-b">
                <h3 class="text-xl font-bold text-gray-800 truncate" title="${name}">${name}</h3>
               
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button class="share-summary-btn text-green-500 hover:text-green-600 p-2 rounded-full hover:bg-gray-100" title="Compartilhar Resumo de ${name}" data-person-name="${name}">
                        <i class="fa-brands fa-whatsapp fa-lg"></i>
                    </button>
                    <button class="add-third-party-debt-btn text-purple-500 hover:text-purple-600 p-2 rounded-full hover:bg-gray-100" title="Adicionar Dívida para ${name}" data-person-name="${name}">
                        <i class="fa-solid fa-comment-dollar fa-lg"></i>
                    </button>
                    <button class="register-payment-btn text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100" title="Registrar Pagamento de ${name} (Lançar Crédito)" data-person-name="${name}">
                        <i class="fa-solid fa-hand-holding-dollar fa-lg"></i>
                    </button>
                    <button class="details-toggle-btn text-gray-500 p-2 rounded-full hover:bg-gray-100" title="Ver detalhes">
                        <i class="fa-solid fa-chevron-down details-chevron transition-transform"></i>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-center pt-4">
                <div>
                    <span class="text-xs text-gray-500 block">Total no Mês</span>
                    <p class="font-semibold text-gray-700 text-sm">${formatCurrency(totalDebitosNoMes)}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 block">Pendente (Mês)</span>
                    <p class="font-bold text-base ${pendenteNoMes > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(pendenteNoMes)}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 block">Crédito Geral</span>
                    <p class="font-semibold text-green-600 text-sm">${formatCurrency(personCredit)}</p>
                </div>
            </div>
            
            ${creditButtonHTML}

            <div class="third-party-details hidden mt-4 border-t pt-4">
                ${tabsHTML}
                <div class="mt-4">
                    ${tabsContentHTML}
                </div>
            </div>
        `;
        container.appendChild(cardElement);
    }
}

function openEditCreditModal(transaction) {
    const modal = document.getElementById('editCreditModal');
    const personName = transaction.thirdParty;

    modal.innerHTML = `
    <div class="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800">Editar Crédito de ${personName}</h3>
            <button class="close-modal-btn text-gray-400 hover:text-gray-600"><i class="fa fa-times fa-lg"></i></button>
        </div>
        <form id="edit-credit-form" novalidate>
            <input type="hidden" name="transactionId" value="${transaction.id}">
            <div class="mb-4">
                <label for="edit-credit-value" class="block text-sm font-medium text-gray-700 mb-1">Valor do Crédito</label>
                <input type="text" id="edit-credit-value" name="value" inputmode="decimal" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-right" required 
                       value="${formatCurrencyInput(String(transaction.valor * 100))}" 
                       oninput="this.value = formatCurrencyInput(this.value)">
            </div>
            <div class="mb-6">
                <label for="edit-credit-date" class="block text-sm font-medium text-gray-700 mb-1">Data do Crédito</label>
                <input type="date" id="edit-credit-date" name="date" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required value="${transaction.data}">
            </div>
            <div class="flex justify-end">
                <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700">Salvar Alterações</button>
            </div>
        </form>
    </div>`;

    const form = modal.querySelector('#edit-credit-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const transactionId = form.elements.transactionId.value;
        const originalTransaction = transactions.find(t => t.id === transactionId);
        if (!originalTransaction) return;
    
        const personName = originalTransaction.thirdParty;
        const originalValue = parseFloat(originalTransaction.valor);
        const newValue = parseCurrency(form.elements.value.value);
        const newDate = form.elements.date.value;
    
        if (isNaN(newValue) || newValue <= 0) {
            alert("O valor inserido é inválido.");
            return;
        }
    
        // --- LÓGICA DE VALIDAÇÃO REFINADA ---
        // 1. Pega o saldo de crédito atual e disponível para a pessoa.
        const personCredit = parseFloat(settings.thirdPartyCredits[personName] || 0);
        // 2. Calcula o impacto que a edição do valor do crédito terá no saldo geral.
        const creditDifference = newValue - originalValue;
        // 3. Simula qual seria o novo saldo de crédito da pessoa após a alteração.
        const projectedBalance = personCredit + creditDifference;
    
        // 4. Se o saldo simulado for negativo, significa que a pessoa já usou mais
        //    crédito do que teria com o novo valor. A ação é bloqueada.
        if (projectedBalance < 0) {
            closeModal(); // Fecha o modal de edição
            openGenericConfirmModal({
                title: 'Ação Inválida',
                message: `A edição não pode ser salva. O valor do crédito não pode ser inferior ao montante que já foi utilizado por ${personName}.`,
                confirmText: 'Entendi',
                iconClass: 'fa-solid fa-ban text-red-500'
            });
            return; // Interrompe a execução aqui
        }
    
        // Se a validação passar, o código prossegue com a atualização.
        settings.thirdPartyCredits[personName] = projectedBalance;
        await saveSettings();
    
        const updatedTransactionData = { valor: newValue, data: newDate };
        await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', transactionId), updatedTransactionData);
        
        originalTransaction.valor = newValue;
        originalTransaction.data = newDate;
    
        closeModal();
        updateUIForMonth();
    });

    openModal(modal);
}

        main();
