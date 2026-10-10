import './style.css';
import { createApp } from './app';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element');
}
createApp(root);
