import { supabase } from "./supabase.js";

const form = document.querySelector("#loginForm");
const errorElement = document.querySelector("#error");

if (!form) {
    throw new Error("Formulaire de connexion introuvable.");
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorElement.textContent = "Connexion…";
    errorElement.className = "";

    const username = document
        .querySelector("#username")
        .value
        .trim()
        .toLowerCase();

    const password = document
        .querySelector("#password")
        .value;

    if (!username || !password) {
        errorElement.textContent =
            "Veuillez remplir tous les champs.";
        errorElement.className = "error";
        return;
    }

    try {

        /*
        ========================================================
        CONNEXION SUPABASE AUTH
        ========================================================
        */

        const {
            data: authData,
            error: authError
        } = await supabase.auth.signInWithPassword({
            email: username,
            password: password
        });

        if (authError) {
            console.error(
                "Erreur de connexion :",
                authError
            );

            errorElement.textContent =
                "Identifiant ou mot de passe incorrect.";

            errorElement.className = "error";

            return;
        }

        if (!authData?.user) {
            errorElement.textContent =
                "Impossible de récupérer votre compte.";

            errorElement.className = "error";

            return;
        }

        /*
        ========================================================
        RECUPERATION DU PROFIL
        ========================================================
        */

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select(`
                id,
                username,
                display_name,
                first_name,
                last_name,
                active
            `)
            .eq("id", authData.user.id)
            .single();

        if (profileError || !profile) {

            console.error(
                "Profil introuvable :",
                profileError
            );

            await supabase.auth.signOut();

            errorElement.textContent =
                "Votre profil MSA n'existe pas encore.";

            errorElement.className = "error";

            return;
        }

        /*
        ========================================================
        VERIFICATION DU COMPTE
        ========================================================
        */

        if (!profile.active) {

            await supabase.auth.signOut();

            errorElement.textContent =
                "Votre compte est désactivé.";

            errorElement.className = "error";

            return;
        }

        /*
        ========================================================
        RECUPERATION DES ROLES
        ========================================================
        */

        const {
            data: userRoles,
            error: rolesError
        } = await supabase
            .from("user_roles")
            .select(`
                role_id,
                roles (
                    id,
                    name,
                    description,
                    icon,
                    is_admin
                )
            `)
            .eq("user_id", profile.id);

        if (rolesError) {

            console.error(
                "Erreur récupération rôles :",
                rolesError
            );

            await supabase.auth.signOut();

            errorElement.textContent =
                "Impossible de récupérer vos rôles.";

            errorElement.className = "error";

            return;
        }

        /*
        ========================================================
        PREPARATION DES ROLES
        ========================================================
        */

        const roles = (userRoles || [])
            .map(item => item.roles)
            .filter(Boolean);

        const adminRole = roles.find(
            role => role.is_admin === true
        );

        const normalRoles = roles.filter(
            role => role.is_admin !== true
        );

        /*
        ========================================================
        CREATION DE LA SESSION LOCALE
        ========================================================
        */

        const loggedUser = {

            id: profile.id,

            username: profile.username,

            display_name: profile.display_name,

            first_name: profile.first_name,

            last_name: profile.last_name,

            active: profile.active,

            /*
            L'ADMIN EST SEPARE DES AUTRES ROLES
            POUR EVITER L'AFFICHAGE EN DOUBLE
            */

            is_admin: Boolean(adminRole),

            admin_role: adminRole || null,

            roles: normalRoles

        };

        sessionStorage.setItem(
            "msa_user",
            JSON.stringify(loggedUser)
        );

        /*
        ========================================================
        REDIRECTION
        ========================================================
        */

        window.location.href = "index.html";

    } catch (error) {

        console.error(
            "Erreur inattendue :",
            error
        );

        errorElement.textContent =
            "Une erreur est survenue pendant la connexion.";

        errorElement.className = "error";

    }

});
