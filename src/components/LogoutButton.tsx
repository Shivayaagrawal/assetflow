import { logoutAction } from "@/modules/identity/actions/auth.actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button className="secondary" type="submit">
        Log out
      </button>
    </form>
  );
}
