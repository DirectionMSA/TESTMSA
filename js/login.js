import { supabase } from "./supabase.js";

const form = document.querySelector("#loginForm");
const errorElement = document.querySelector("#error");

if (!form) {
    throw new Error(
        "Formulaire de connexion introuvable."
    );
}

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        errorElement.textContent =
            "Connexion…";

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

            return;
        }

        try {

            /*
             * Pour l'instant, l'identifiant est
             * directement utilisé comme email Supabase.
             *
             * Exemple :
             * admin@msa.com
             */

            const email = username;

            const {
                data,
                error
            } = await supabase.auth.signInWithPassword({

                email: email,

                password: password

            });

            if (error) {

                console.error(
                    "Erreur de connexion :",
                    error
                );

                errorElement.textContent =
                    "Identifiant ou mot de passe incorrect.";

                return;
            }

            if (!data || !data.user) {

                errorElement.textContent =
                    "Impossible de récupérer votre compte.";

                return;
            }

            /*
             * Récupérer le profil MSA
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
                .eq(
                    "id",
                    data.user.id
                )
                .single();

            if (profileError) {

                console.error(
                    "Erreur profil :",
                    profileError
                );

                await supabase.auth.signOut();

                errorElement.textContent =
                    "Profil utilisateur introuvable.";

                return;
            }

            /*
             * Vérifier que le compte est actif
             */

            if (!profile.active) {

                await supabase.auth.signOut();

                errorElement.textContent =
                    "Ce compte a été désactivé.";

                return;
            }

            /*
             * Récupérer les rôles de l'utilisateur
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
                .eq(
                    "user_id",
                    data.user.id
                );

            if (rolesError) {

                console.error(
                    "Erreur rôles :",
                    rolesError
                );

                await supabase.auth.signOut();

                errorElement.textContent =
                    "Impossible de récupérer vos rôles.";

                return;
            }

            /*
             * Vérifier si l'utilisateur est Admin
             */

            const isAdmin =
                (userRoles || [])
                    .some(
                        item =>
                            item.roles &&
                            item.roles.is_admin === true
                    );

            /*
             * Sauvegarder les informations
             * dans la session du navigateur.
             */

            const loggedUser = {

                id:
                    profile.id,

                username:
                    profile.username,

                display_name:
                    profile.display_name,

                first_name:
                    profile.first_name,

                last_name:
                    profile.last_name,

                active:
                    profile.active,

                roles:
                    (userRoles || [])
                        .map(
                            item =>
                                item.roles
                        )
                        .filter(Boolean),

                isAdmin:
                    isAdmin

            };

            sessionStorage.setItem(
                "msa_user",
                JSON.stringify(
                    loggedUser
                )
            );

            /*
             * Aller au tableau de bord
             */

            window.location.href =
                "index.html";

        } catch (err) {

            console.error(
                "Erreur inattendue :",
                err
            );

            errorElement.textContent =
                "Une erreur est survenue lors de la connexion.";

        }

    }
);
