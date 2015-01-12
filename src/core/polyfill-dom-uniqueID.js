void function() {
	if(!('uniqueID' in document.documentElement)) {
		var uniqueID_counter = 0;
		Object.defineProperty(Element.prototype, 'uniqueID', {get: function() {
			if(this.id) {
				return(this.id);
			} else {
				return(this.id = ("EL__"+(++uniqueID_counter)+"__"));
			}
		}});
	}
}();