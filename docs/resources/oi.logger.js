/**
	Open Innovations tool for editing CSV files in the browser
	Version 0.1
 */
(function(root){
	var OI = root.OI || {};
	if(!OI.logger){
		// Version 1.5
		OI.logger = function(title,attr){
			if(!attr) attr = {};
			title = title||"OI Logger";
			var ms = {};
			this.logging = (location.search.indexOf('debug=true') >= 0);
			if(console && typeof console.log==="function"){
				this.log = function(){ if(this.logging){ console.log.apply(null,getParam(arguments)); updatePage('log',arguments); } };
				this.info = function(){ console.info.apply(null,getParam(arguments)); updatePage('info',arguments); };
				this.warn = function(){ console.warn.apply(null,getParam(arguments)); updatePage('warning',arguments); };
				this.error = function(){ console.error.apply(null,getParam(arguments)); updatePage('error',arguments); };
			}
			this.remove = function(id){
				var el = attr.el.querySelector('#'+id);
				if(ms[id]) clearTimeout(ms[id]);
				if(el) el.remove();
			};
			function updatePage(){
				if(attr.el){
					var id, el, visible = false;
					var cls = arguments[0];
					var txt = Array.prototype.shift.apply(arguments[1]);
					var opt = arguments[1]||{};
					if(opt.length > 0) opt = opt[opt.length-1];
					if(attr.visible.includes(cls)) visible = true;
					if(visible){
						id = "default";
						if(opt.id) id = opt.id;
						el = document.getElementById(id);
						if(!el){
							el = document.createElement('div');
							el.classList.add('message',cls);
							el.setAttribute('id',id);
						}
						if(attr.class) el.classList.add(...attr.class.split(/ /));
						el.innerHTML = '<div class="message-inner">'+txt.replace(/\%c/g,"")+'</div>';
						el.style.display = (txt ? '' : 'none');
						attr.el.prepend(el);
						var cls = document.createElement('div');
						cls.setAttribute('tabindex',0);
						cls.classList.add('close');
						cls.innerHTML = '&times;';
						cls.addEventListener('click',function(e){ clearTimeout(ms[id]); el.remove(); });
						el.appendChild(cls);
						ms[id] = setTimeout(function(){ el.remove(); },(typeof opt.fade==="number" ? opt.fade : (typeof attr.fade==="number" ? attr.fade : 10000)));
					}
				}
			}
			function getParam(){
				var a = Array.prototype.slice.call(arguments[0], 0);
				var str = (typeof a[0]==="string" ? a[0] : "");
				// Build basic result
				var ext = ['%c'+title+'%c: '+str.replace(/<[^\>]*>/g,""),'font-weight:bold;',''];
				var n = (str ? 1 : 0);
				// If there are extra parameters passed we add them
				return (a.length > n) ? ext.concat(a.splice(n)) : ext;
			}
			return this;
		};
	}

	root.OI = OI||root.OI||{};

})(window || this);