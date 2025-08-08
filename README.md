# Central de Controle Financeiro PRO

## Descrição do Projeto

A **Central de Controle Financeiro PRO** é uma aplicação web completa e intuitiva, desenvolvida para auxiliar no gerenciamento de finanças pessoais e de terceiros. A ferramenta permite o registro detalhado de receitas e despesas, gerenciamento de cartões de crédito, acompanhamento de faturas e controle de orçamentos. Além disso, oferece uma visão clara do fluxo de caixa e relatórios financeiros completos por meio de gráficos interativos.

A aplicação utiliza o Firebase como backend, garantindo um sistema de autenticação robusto e armazenamento de dados em tempo real com o Firestore.

---

## Funcionalidades

- **Autenticação de Usuário:** Sistema de login e registro seguro usando Firebase Authentication.
- **Dashboard Interativo:** Visão geral das finanças do mês atual com resumos de receitas, despesas e saldo.
- **Gestão de Transações:** Adicione, edite e exclua transações financeiras (receitas, despesas, investimentos, etc.).
- **Relatórios Financeiros:** Gere e visualize relatórios detalhados com gráficos para entender a distribuição de receitas e despesas ao longo do tempo.
- **Projeção Financeira:** Ferramenta para simular e projetar cenários financeiros futuros.
- **Gerenciamento de Faturas:** Acompanhe o status de faturas de cartão de crédito e despesas de terceiros.
- **PWA (Progressive Web App):** Aplicação instalável em dispositivos móveis ou desktop, com caching de recursos para funcionamento offline.

---

## Tecnologias Utilizadas

### Frontend
- HTML5
- JavaScript (ES6+)
- [Tailwind CSS](https://tailwindcss.com/) – Framework para estilização rápida e responsiva.
- [Chart.js](https://www.chartjs.org/) – Biblioteca para gráficos dinâmicos.
- [Font Awesome](https://fontawesome.com/) – Biblioteca de ícones.

### Backend
- [Firebase](https://firebase.google.com/)
  - Firebase Authentication (login e registro)
  - Cloud Firestore (banco NoSQL em tempo real)

---

## Estrutura do Projeto

- `index.html` - Página principal com dashboard financeiro  
- `reports.html` - Página para relatórios e gráficos  
- `projecao.html` - Página de projeção financeira  
- `main.js` - Lógica principal do frontend  
- `reports.js` - Scripts para relatórios e gráficos  
- `firebase-config.js` - Configuração do Firebase  
- `service-worker.js` - Service Worker para PWA (offline e caching)  
- `manifest.json` - Manifesto do PWA (nome, ícones, cores)


---

## Como Instalar e Rodar

### 1. Clone o Repositório

```bash
git clone [URL_DO_SEU_REPOSITORIO]
cd [NOME_DO_SEU_REPOSITORIO]

2. Configurar o Firebase
Crie um projeto no Console do Firebase.

Habilite o Firebase Authentication (método Email/Senha).

Habilite o Cloud Firestore.

Obtenha as credenciais do seu projeto no Firebase.

Atualize o arquivo firebase-config.js com suas credenciais.

3. Executar o Servidor
Por ser uma aplicação estática, você pode abrir os arquivos diretamente no navegador ou usar uma extensão como Live Server no VS Code.

4. Acessar a Aplicação
Abra o arquivo index.html no seu navegador. Você será direcionado para a página de login/registro para começar.

Contato
Para dúvidas, sugestões ou contribuições, sinta-se à vontade para abrir uma issue ou pull request.
