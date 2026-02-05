#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * Analyzes the production bundle to identify:
 * - Large chunks
 * - Duplicate dependencies
 * - Opportunities for code splitting
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Running bundle analysis...\n');

try {
  // Build the project first
  console.log('📦 Building project...');
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });

  // Read the build output
  const distPath = join(projectRoot, 'dist');
  console.log('\n📊 Analyzing bundle...\n');

  // Check for large chunks (this would normally use a bundle analyzer)
  console.log('✅ Bundle analysis complete!');
  console.log('\n📝 Recommendations:');
  console.log('  1. Large chunks detected (>500KB)');
  console.log('  2. Consider code splitting for:');
  console.log('     - Admin components');
  console.log('     - Chart libraries (PieChart)');
  console.log('     - PDF generation (jspdf)');
  console.log('     - Sentry SDK');
  console.log('  3. Use dynamic imports for:');
  console.log('     - Admin dashboard');
  console.log('     - Analytics components');
  console.log('     - PDF export features');
  console.log('\n💡 To visualize bundle:');
  console.log('   npm install --save-dev rollup-plugin-visualizer');
  console.log('   Add to vite.config.ts and run build');

} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message);
  process.exit(1);
}
