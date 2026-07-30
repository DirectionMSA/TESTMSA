import { supabase } from "./supabase.js";
const form=document.querySelector("#registerForm"),message=document.querySelector("#message");
form.addEventListener("submit",async e=>{e.preventDefault();message.textContent="Envoi…";message.className="";
const {error}=await supabase.rpc("submit_account_request",{p_username:document.querySelector("#username").value.trim().toLowerCase(),p_display_name:document.querySelector("#displayName").value.trim(),p_password:document.querySelector("#password").value,p_reason:document.querySelector("#reason").value.trim()});
if(error){message.textContent=error.message;message.className="error";return}form.reset();message.textContent="Votre demande a été envoyée. L'administration doit maintenant la valider.";message.className="success";});