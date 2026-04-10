import { extractCsrfToken } from "./csrf.js";

export async function register(agent, { name, email, password }) {
  const page = await agent.get("/register");
  const csrf = extractCsrfToken(page.text);

  const res = await agent.post("/register").type("form").send({
    _csrf: csrf,
    name,
    email,
    password,
  });

  return res;
}
