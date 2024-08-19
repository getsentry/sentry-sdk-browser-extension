import { A, useLocation } from "@solidjs/router";
import { ParentProps } from "solid-js";

export const Layout = (props: ParentProps) => {
    // const location = useLocation();

  return (
    <>
    <header>
      <A href="/" class="header-logo">
        <img src="/sentry-logo.svg" alt="Sentry" />
      </A>

      <nav>
        <ul>
          <li>
            <A href="/">
              Overview
            </A>
          </li>
          </ul>
      </nav>

    </header>
     
      <main>
        <h1>Sentry SDK</h1>
        <div>
          {props.children}
        </div>
      </main>
    </>
  );
};
