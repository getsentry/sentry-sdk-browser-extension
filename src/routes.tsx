import { type RouteDefinition } from '@solidjs/router';

import Home from './pages/home';
import PageNotFound from './pages/404';
import Replay from './pages/replay';

export const routes = [
	{
		path: '/',
		component: Home,
	},
	{
		path: '/replay',
		component: Replay,
	},
	{
		path: '**',
		component: PageNotFound,
	},
] satisfies RouteDefinition[];
