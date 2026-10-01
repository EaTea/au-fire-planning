import { useNavigate } from "react-router";

import { useDisclaimer } from "../../persistence/PersistenceProvider";
import { Card } from "../components/Card";

/** Where "Start planning" goes: the first step with inputs in M1 (Household arrives in M2). */
const FIRST_INPUT_STEP_PATH = "/income-expenses";

/**
 * The first-run welcome page at `#/welcome` (not one of the seven steps). It
 * explains what the app does, shows the disclaimer (NFR-5) and the privacy
 * note (NFR-4), and its "Start planning" button records acceptance and moves
 * on to the first step with inputs.
 *
 * Connections: PersistenceProvider redirects every first visit here before the
 * router mounts, and supplies `acceptDisclaimer` through `useDisclaimer`. If
 * someone opens `#/welcome` after accepting, the page simply shows again as a
 * reference; pressing the button does not change the stored acceptance time.
 */
export function WelcomeScreen() {
  const { acceptDisclaimer } = useDisclaimer();
  const navigate = useNavigate();

  /** Stores acceptance, then goes to the first input step. Wired to the button. */
  async function startPlanning() {
    await acceptDisclaimer();
    navigate(FIRST_INPUT_STEP_PATH);
  }

  return (
    <section className="page welcome">
      <h1 className="page-title">Welcome to AU FIRE Planner</h1>
      <p className="page-intro">
        This app helps you work out how much you need to retire early in Australia. You enter your
        spending and savings, and it shows your FI number and how far along you are.
      </p>

      <Card title="Before you start">
        <p>
          This app gives general information and modelling only. It isn&apos;t personal financial,
          tax or legal advice. Consider getting advice for your situation.
        </p>
      </Card>

      <Card title="Your privacy">
        <p>Your plan is stored only in this browser on this device. Nothing is sent anywhere.</p>
      </Card>

      <button type="button" className="footer-link" onClick={() => void startPlanning()}>
        Start planning
      </button>
    </section>
  );
}
