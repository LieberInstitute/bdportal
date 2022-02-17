# Brain Data Portal
Trying to use vite instead of webpack, but it has problems I can't seem to 
be able to solve:
 - the CSS is not loaded properly from node_modules packages (specifically 
 bootstrap/dist/css/bootstrap.min.css and similarly bootstrap-slider.min.css)
 - some functions behave quite differently compared to webpack project during
   development (different polyfills?), e.g. json.gz is automatically 
   uncompressed etc.
 - the production build does not seem to work at all
