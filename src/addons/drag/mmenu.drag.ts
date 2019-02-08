Mmenu.addons.drag = function(
	this : Mmenu
) {
	if ( !this.opts.offCanvas )
	{
		return;
	}
	if ( typeof Hammer != 'function' || Hammer.VERSION < 2 )
	{
		return;
	}


	var options = this.opts.drag,
		configs = this.conf.drag;


	//	Extend shorthand options
	if ( typeof options == 'boolean' )
	{
		(options as mmLooseObject) = {
			menu 	: options,
			panels 	: options
		};
	}
	if ( typeof options != 'object' )
	{
		(options as mmLooseObject) = {};
	}
	if ( typeof options.menu == 'boolean' )
	{
		(options as mmLooseObject) = {
			open 	: options.menu
		};
	}
	if ( typeof options.menu != 'object' )
	{
		(options.menu as mmLooseObject) = {};
	}
	if ( typeof options.panels == 'boolean' )
	{
		options.panels = {
			close 	: options.panels
		};
	}
	if ( typeof options.panels != 'object' )
	{
		(options.panels as mmLooseObject) = {};
	}
	//	/Extend shorthand options


	this.opts.drag = Mmenu.extend( options, Mmenu.options.drag );


	function minMax( val, min, max )
	{
		if ( val < min )
		{
			val = min;
		}
		if ( val > max )
		{
			val = max;
		}
		return val;
	}


	//	Drag open the menu
	if ( options.menu.open )
	{
		this.bind( 'setPage:after', () => {
			//	defaults for "left"
			var drag = {
				events 		: 'panleft panright',
				typeLower 	: 'x',
				typeUpper 	: 'X',
				open_dir 	: 'right',
				close_dir 	: 'left',
				negative	: false
			};
			var _dimension 		= 'width',
				_winDimension	= 'innerWidth',
				_direction 		= drag.open_dir;

			var doPanstart = function( 
				this	: Mmenu,
				pos 	: number
			) {
				if ( pos <= options.menu.maxStartPos )
				{
					_stage = 1;
				}
			};
			var getSlideNodes = function(
				this : Mmenu
			) : HTMLElement[] {
				return Mmenu.DOM.find( document.body, '.mm-slideout' );
			};

			var _stage 			= 0,
				_distance 		= 0,
				_maxDistance 	= 0;

			var new_distance, drag_distance;


			//	Find menu position from Positioning extension
			var x = this.opts.extensions[ 'all' ];

			var position = ( typeof x == 'undefined' )
				? 'left'
				: ( x.indexOf( 'mm-menu_position-right' ) > -1 )
					? 'right'
					: ( x.indexOf( 'mm-menu_position-top' ) > -1 )
						? 'top'
						: ( x.indexOf( 'mm-menu_position-bottom' ) > -1 )
							? 'bottom'
							: 'left';

			var zposition = ( typeof x == 'undefined' )
				? 'back'
				: ( x.indexOf( 'mm-menu_position-top' 	 ) > -1 ) ||
				  ( x.indexOf( 'mm-menu_position-bottom' ) > -1 ) ||
				  ( x.indexOf( 'mm-menu_position-front'  ) > -1 )
					? 'front'
					: 'back';


			switch( position )
			{
				case 'top':
				case 'bottom':
					drag.events		= 'panup pandown';
					drag.typeLower	= 'y';
					drag.typeUpper	= 'Y';

					_dimension 		= 'height';
					_winDimension	= 'innerHeight';
					break;
			}

			switch( position )
			{	
				case 'right':
				case 'bottom':
					drag.negative 	= true;
					doPanstart		= function( 
						this	: Mmenu,
						pos 	: number
					) {
						if ( pos >= window[ _winDimension ] - options.menu.maxStartPos )
						{
							_stage = 1;
						}
					};
					break;
			}

			switch( position )
			{
				case 'right':
					drag.open_dir 	= 'left';
					drag.close_dir 	= 'right';
					break;

				case 'top':
					drag.open_dir 	= 'down';
					drag.close_dir 	= 'up';
					break;

				case 'bottom':
					drag.open_dir 	= 'up';
					drag.close_dir 	= 'down';
					break;
			}

			switch ( zposition )
			{
				case 'front':
					getSlideNodes = function(
						this : Mmenu
					) : HTMLElement[] {
						return [ this.node.menu ];
					};
					break;
			}

			var slideOutNodes 	: HTMLElement[];
			var dragNode 		: HTMLElement = Mmenu.valueOrFn( this.node.menu, options.menu.node, Mmenu.node.page );

			if ( typeof dragNode == 'string' )
			{
				dragNode = document.querySelector( dragNode );
			}


			//	Bind events
			var _hammer = new Hammer( dragNode, this.opts.drag.vendors.hammer );

			_hammer
				.on( 'panstart', ( evnt ) => {
					doPanstart.call( this, evnt.center[ drag.typeLower ] );
					slideOutNodes = getSlideNodes.call( this );
					_direction = drag.open_dir;
				});

			_hammer
				.on( drag.events + ' panend', ( evnt ) => {
					if ( _stage > 0 )
					{
						evnt.preventDefault();
					}
				});

			_hammer
				.on( drag.events, ( evnt ) => {
					new_distance = evnt[ 'delta' + drag.typeUpper ];
					if ( drag.negative )
					{
						new_distance = -new_distance;
					}

					if ( new_distance != _distance )
					{
						_direction = ( new_distance >= _distance ) ? drag.open_dir : drag.close_dir;
					}

					_distance = new_distance;

					if ( _distance > options.menu.threshold )
					{
						if ( _stage == 1 )
						{
							if ( document.documentElement.matches( '.mm-wrapper_opened' ) )
							{
								return;
							}
							_stage = 2;

							this._openSetup();
							this.trigger( 'open:start' );
							document.documentElement.classList.add( 'mm-wrapper_dragging' );

							_maxDistance = minMax( 
								window[ _winDimension ] * configs.menu[ _dimension ].perc, 
								configs.menu[ _dimension ].min,
								configs.menu[ _dimension ].max
							);
						}
					}
					if ( _stage == 2 )
					{
						drag_distance = minMax( _distance, 10, _maxDistance ) - ( zposition == 'front' ? _maxDistance : 0 );
						if ( drag.negative )
						{
							drag_distance = -drag_distance;
						}
						let css_value = 'translate' + drag.typeUpper + '(' + drag_distance + 'px )';

						slideOutNodes.forEach(( node ) => {
							node.style[ '-webkit-transform' ] = '-webkit-' + css_value;
							node.style[ 'transform' ] = css_value;
						});
					}
				});

			_hammer
				.on( 'panend', ( evnt ) => {
					if ( _stage == 2 )
					{
						document.documentElement.classList.remove( 'mm-wrapper_dragging' );
						
						slideOutNodes.forEach(( node ) => {
							node.style[ '-webkit-transform' ] = '';
							node.style[ 'transform' ] = '';
						});

						this[ _direction == drag.open_dir ? '_openFinish' : 'close' ]();
					}
		        	_stage = 0;
			    });
		});
	}

	//	Drag close panels
	if ( options.panels.close )
	{
		this.bind( 'initPanel:after', (
			panel : HTMLElement
		) => {
			var parent = panel[ 'mmParent '];

			if ( parent )
			{
				parent = parent.closest( '.mm-panel' );

				var _hammer = new Hammer( panel, this.opts.drag.vendors.hammer ),
					timeout = null;

				_hammer
					.on( 'panright',
						( e ) => {
							if ( timeout )
							{
								return;
							}
							this.openPanel( parent );

							//	prevent dragging while panel still open.
							timeout = setTimeout(
								() => {
									clearTimeout( timeout );
									timeout = null;
								}, this.conf.openingInterval + this.conf.transitionDuration
							);
						}
					);
			}
		});
	}
};
