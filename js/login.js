import { supabase } from "./supabase.js";
const form=document.querySelector("#loginForm"), error=document.querySelector("#error");
form.addEventListener("submit",async e=>{e.preventDefault();error.textContent="Connexion…";const username=document.querySelector("#username").value.trim().toLowerCase(),password=document.querySelector("#password").value;
const {data,error:err}=await supabase.rpc("login_with_username",{p_username:username,p_password:password});
if(err||!data?.length){error.textContent=err?.message||"Identifiants incorrects.";return}
const user=data[0];sessionStorage.setItem("msa_user",JSON.stringify(user));location.href="index.html";});