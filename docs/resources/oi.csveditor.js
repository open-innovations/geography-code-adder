/**
	Open Innovations tool for editing CSV files in the browser
	Version 0.1
 */
(function(root){

	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	function CSVEditor(el,opts){
		if(!opts) opts = {};
		this.name = "CSV Editor";
		this.version = "0.1";
		var msg = new OI.logger(this.name+' v'+this.version,{el:document.getElementById('messages'),'visible':['info','warning','error'],'fade':60000,'class':'msg'});
		var table;
		this.data = [];
		this.selected = {'cols':[],'rows':[]};
		this._emptyrows = [];
		var _obj = this;

		this.update = function(){
			msg.log("update");
			if(typeof opts.update==="function") opts.update.call(this);
		}

		this.delete = function(){
			msg.log("delete");
			// Delete all selected
			var rows = this.selected.rows.sort().reverse();
			var cols = this.selected.cols.sort().reverse();
			if(table){
				for(i = 0; i < cols.length; i++){
					table.querySelectorAll('tr th:nth-child('+(cols[i]+1)+'),tr td:nth-child('+(cols[i]+1)+')').forEach(function(el){ el.remove(); });
					// Remove the column from the order
					this.order.splice(cols[i]-1,1);
				}
				for(i = 0; i < rows.length; i++) this.deleteRow(i);
				this.selected = {'cols':[],'rows':[]};

				this.updateRowNumbers();

				th = table.querySelectorAll('th');
				for(i = 1; i < th.length; i++){
					th[i].setAttribute('data',i);
				}
			}
			if(typeof opts.delete==="function") opts.delete.call(this);
			this.update();
			if(typeof opts.edit==="function") opts.edit.call(this);
			return this;
		};

		this.deleteRow = function(i){
			table.querySelector('tr:nth-child('+(i+1)+')').remove();
			// Remove the row from the data
			this.data.splice(i-1,1);
			return this;
		};

		this.updateRowNumbers = function(){
			// Update row numbers
			tr = table.querySelectorAll('tr');
			for(i = 1; i < tr.length; i++){
				tr[i].setAttribute('data',i);
				tr[i].querySelector('.row').innerHTML = i;
			}
			return this;
		};

		this.findEmptyRows = function(){
			var r,c,v;
			this._emptyrows = [];
			for(r = 0; r < this.data.length; r++){
				v = '';
				for(c in this.data[r]) v += this.data[r][c];
				if(v=='') this._emptyrows.push(r+1);
			}
			return this;
		};

		this.getCell = function(r,c){
			return table.querySelector('tr:nth-child('+(r+2)+') td:nth-child('+(c+1)+')');
		};

		this.deleteEmptyRows = function(){
			for(var r = this._emptyrows.length-1; r >= 0; r--) this.deleteRow(this._emptyrows[r]);
			this.updateRowNumbers();
			this._emptyrows = [];
			this.update();
			if(typeof opts.edit==="function") opts.edit.call(this);
			return this;
		};

		this.updateSelectedColumns = function(fn){
			var i,c,r,cell,otxt,txt,w=0;
			if(this.selected.cols.length > 0){
				for(r = 0; r < this.data.length; r++){
					for(i = 0; i < this.selected.cols.length; i++){
						c = this.selected.cols[i];
						otxt = this.data[r][this.order[c-1]];
						txt = fn.call(this,otxt);
						if(txt!=otxt){
							// Update data and cell
							this.data[r][this.order[c-1]] = txt;
							cell = this.getCell(r,c);
							cell.innerHTML = txt;
						}else w++;
					}
				}
				if(w > 0){
					msg.warn('There are '+w+' invalid dates. They should be in the form DD/MM/YYYY.',{'id':'bad-dates'});
				}
			}
			return this;
		};

		this.select = function(dir,i,shift,ctrl){
			var c,min,max,str;
			function css(dir,i,sel){
				if(dir=="cols") return 'tr th'+(sel ? '[aria-multiselectable]':'')+':nth-child('+(i+1)+'),tr td'+(sel ? '[aria-multiselectable]':'')+':nth-child('+(i+1)+')';
				else return 'tr:nth-child('+(i+1)+') td';
			}
			if(dir=="cols" && this.selected.rows && this.selected.rows.length > 0){
				this.selected.rows = [];
				table.querySelectorAll(css(dir,i,true)).forEach(deselectEl)
			}else if(dir=="rows" && this.selected.cols && this.selected.cols.length > 0){
				this.selected.cols = [];
				table.querySelectorAll(css(dir,i,true)).forEach(deselectEl)
			}
			if(shift){
				if(!this.selected[dir].includes(i)){
					min = Math.min(this.selected[dir][this.selected[dir].length-1],i);
					max = Math.max(this.selected[dir][this.selected[dir].length-1],i);
					for(c = min; c <= max; c++){
						if(!this.selected[dir].includes(c)){
							table.querySelectorAll(css(dir,c)).forEach(selectEl);
							this.selected[dir].push(c);
						}
					}
				}
			}else if(ctrl){
				if(this.selected[dir].includes(i)){
					// Deselect this column
					table.querySelectorAll(css(dir,i,true)).forEach(deselectEl);
					// Remove the column from the selection
					this.selected[dir].splice(this.selected[dir].indexOf(i),1);
				}else{
					this.selected[dir].push(i);
					table.querySelectorAll(css(dir,i)).forEach(selectEl);
				}
			}else{
				// Remove all selections
				table.querySelectorAll('[aria-multiselectable]').forEach(deselectEl);
				if(this.selected[dir].includes(i)){
					this.selected[dir] = [];
				}else{
					this.selected[dir] = [];
					this.selected[dir].push(i);
					table.querySelectorAll(css(dir,i)).forEach(selectEl);
				}
			}
			if(typeof opts.select==="function") opts.select.call(this);
			this.update();
			return this;
		}

		this.updateData = function(data,order){
			var c,r,th,tr,nc,html;
			msg.log("updateData");
			if(!table){
				el.innerHTML = '<div class="table-holder"><table></table></div>';
				table = el.querySelector('table');
			}
			this.order = order;
			this.data = data;

			html = '';

			if(this.data.length > 0){
				th = '<th class="row"></th>';
				nc = this.order.length;
				for(c = 0; c < nc; c++){
					th += '<th data="'+(c+1)+'" tabindex="0" contenteditable>'+this.order[c]+'</th>';
				}
				html += '<tr data="0">'+th+'</tr>';
				for(r = 0; r < this.data.length; r++){
					tr = '<td class="row" tabindex="0">'+(r+1)+'</td>';
					for(c = 0; c < nc; c++){
						tr += '<td data="'+(c+1)+'" contenteditable>'+this.data[r][this.order[c]]+'</td>';
					}
					html += '<tr data="'+(r+1)+'">'+tr+'</tr>';
				}

				table.innerHTML = html;
				table.querySelectorAll('th').forEach(function(el,i){
					el.addEventListener('click',function(e){ _obj.select("cols",parseInt(el.getAttribute('data')),e.shiftKey,e.ctrlKey); });
					el.addEventListener('keydown',function(e){ if(e.key=="Enter"){ e.preventDefault(); _obj.select("cols",parseInt(el.getAttribute('data')),e.shiftKey,e.ctrlKey); } });
				});
				table.querySelectorAll('td.row').forEach(function(el,i){
					el.addEventListener('click',function(e){ _obj.select("rows",parseInt(el.parentNode.getAttribute('data')),e.shiftKey,e.ctrlKey); });
					el.addEventListener('keydown',function(e){ if(e.key=="Enter"){ e.preventDefault(); _obj.select("rows",parseInt(el.getAttribute('data')),e.shiftKey,e.ctrlKey); } });
				});
				table.addEventListener('input',function(e){
					_obj.updateByDom(e.target);
					if(typeof opts.edit==="function") opts.edit.call(this);
				});

			}else{
				msg.log('No data loaded.');
			}
			this.findEmptyRows();
			this.update();
			if(typeof opts.load==="function") opts.load.call(this);
			return this;
		}

		this.updateByDom = function(el){
			var c = this.getCoord(el);
			var r,old;
			if(c.row<0){
				// Update header
				old = this.order[c.col];
				this.order[c.col] = el.innerHTML;
				// Go through all data updating
				for(r = 0; r < this.data.length; r++){
					// Set new key equal to old data
					this.data[r][this.order[c.col]] = this.data[r][old];
					// Delete old key
					delete this.data[r][old];
				}
			}else{
				// Update cell
				this.data[c.row][c.colname] = el.innerHTML;
			}
			return this;
		};

		this.getCoord = function(el){
			var r = parseInt(el.closest('tr').getAttribute('data'))-1;
			var c = parseInt(el.getAttribute('data'))-1;
			return {'row':r,'col':c,'colname':this.order[c]};
		};

		return this;
	}

	function selectEl(el){ el.setAttribute('aria-multiselectable','true'); }
	function deselectEl(el){ el.removeAttribute('aria-multiselectable'); }

	OI.CSVEditor = CSVEditor;
	root.OI = OI||root.OI||{};

})(window || this);