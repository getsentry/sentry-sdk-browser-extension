import { A } from '@solidjs/router';
import { ParentProps } from 'solid-js';

export const Layout = (props: ParentProps) => {
	return (
		<>
			<header>
				<A href="/" class="header-logo">
					<img src="/sentry-logo.svg" alt="Sentry" />
				</A>

				<nav>
					<ul>
						<li>
							<A href="/" end={true}>
								Overview
							</A>
						</li>
						<li>
							<A href="/replay" end={true}>
								Replay
							</A>
						</li>
					</ul>
				</nav>
			</header>

			<main>
				<div>{props.children}</div>
			</main>
		</>
	);
};
