import { type RouteDefinition } from '@solidjs/router';

import Home from './pages/home';
import PageNotFound from './pages/404';
import Replay from './pages/replay';
import Config from './pages/config';

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
		path: '/config',
		component: Config,
	},
	{
		path: '**',
		component: PageNotFound,
	},
] satisfies RouteDefinition[];
