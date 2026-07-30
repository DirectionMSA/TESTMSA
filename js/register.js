```html
<!doctype html>
<html lang="fr">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Mairie de San Andreas — Tableau de bord
    </title>

    <link
        rel="stylesheet"
        href="css/style.css"
    >

</head>


<body>

<div id="app">

    <!-- =====================================================
         SIDEBAR
    ====================================================== -->

    <aside class="sidebar">

        <!-- LOGO -->

        <div class="brand">

            <div class="brand-mark">
                MSA
            </div>

            <div>

                <b>
                    Mairie
                </b>

                <span>
                    de San Andreas
                </span>

            </div>

        </div>


        <!-- NAVIGATION -->

        <nav>

            <!-- TABLEAU DE BORD -->

            <a
                class="nav-item active"
                data-page="dashboard"
                href="#"
            >
                ⌂
                <span>
                    Tableau de bord
                </span>
            </a>


            <!-- MSA -->

            <div class="nav-label">
                MSA
            </div>


            <a
                class="nav-item"
                data-page="sanctions"
                href="#"
            >
                ⚠
                <span>
                    Sanctions
                </span>
            </a>


            <a
                class="nav-item"
                data-page="blacklist"
                href="#"
            >
                ⛔
                <span>
                    Blacklist
                </span>
            </a>


            <a
                class="nav-item"
                data-page="agenda"
                href="#"
            >
                ▣
                <span>
                    Agenda
                </span>
            </a>


            <a
                class="nav-item"
                data-page="documents"
                href="#"
            >
                ▤
                <span>
                    Documents
                </span>
            </a>


            <!-- CITOYENNETÉ -->

            <div class="nav-label">
                Citoyenneté
            </div>


            <a
                class="nav-item"
                data-page="mariages"
                href="#"
            >
                ♡
                <span>
                    Mariages
                </span>
            </a>


            <a
                class="nav-item"
                data-page="noms"
                href="#"
            >
                ✎
                <span>
                    Changements de nom
                </span>
            </a>


            <!-- ADMINISTRATION -->

            <div class="nav-label admin-only">
                Administration
            </div>


            <a
                class="nav-item admin-only"
                data-page="users"
                href="#"
            >
                ♙
                <span>
                    Comptes
                </span>
            </a>


            <a
                class="nav-item admin-only"
                data-page="requests"
                href="#"
            >
                ☑
                <span>
                    Demandes de comptes
                </span>

                <em id="requestBadge"></em>

            </a>


            <a
                class="nav-item admin-only"
                data-page="permissions"
                href="#"
            >
                ⚙
                <span>
                    Permissions
                </span>
            </a>

        </nav>


        <!-- UTILISATEUR -->

        <div class="sidebar-bottom">

            <div id="userMini"></div>


            <button
                id="logoutBtn"
                class="ghost-btn"
                type="button"
            >
                Se déconnecter
            </button>

        </div>

    </aside>


    <!-- =====================================================
         CONTENU PRINCIPAL
    ====================================================== -->

    <main class="main">


        <!-- HEADER -->

        <header class="topbar">


            <button
                id="mobileMenu"
                class="mobile-menu"
                type="button"
                aria-label="Ouvrir le menu"
            >
                ☰
            </button>


            <div>

                <h1 id="pageTitle">
                    Tableau de bord
                </h1>


                <p id="welcomeText">
                    Bienvenue
                </p>

            </div>


            <div class="top-actions">

                <span
                    id="onlineCount"
                    class="pill"
                >
                    ● Connecté
                </span>

            </div>


        </header>


        <!-- CONTENU DYNAMIQUE -->

        <section
            id="content"
            class="content"
        >
        </section>


    </main>


</div>


<!-- =====================================================
     MODALES
====================================================== -->

<div id="modalRoot"></div>


<!-- =====================================================
     JAVASCRIPT
====================================================== -->

<script
    type="module"
    src="js/app.js"
></script>


</body>

</html>
```
