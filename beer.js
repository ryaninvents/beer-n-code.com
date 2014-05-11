function beerMe(){
  var n = 0;
  var code = (beerMe.toSource?beerMe.toSource():beerMe.toString()).replace(/\s/g,'');
  function getChar(){
    n %= code.length;
    return code.charAt(n++);
  }

  function init(){
    var mug = new BeerMug({colorBottom:'#7a5716',getChar:getChar});
    var $svg = d3.select('body').append('svg')
        .attr('width',500)
        .attr('height',700);
    var $parent = $svg.append('g').attr('transform','translate(230,300)');
    var $g = $parent.append('g').classed('mug',true).attr('transform','translate(-125,-170)');
    var $curlies = $parent.append('g').attr('transform','scale(1,1.5)');
    $curlies.append('text').classed('left curly',true).text('{').attr('x',-100);
    $curlies.append('text').classed('right curly',true).text('}').attr('x',150);
    mug.renderInto($g);
    document.title='beer&code';
  }

  function BeerMug(opt){
      var self = this;
      opt = opt || {};
      
      this.width = opt.width || 30;
      this.height = opt.height || 30;
      this.dx = opt.dx || 8;
      this.dy = opt.dy || 12;

      this.chars = opt.chars || BeerMug.defaultChars;
      this.getChar = opt.getChar || function(){
        return _.sample(self.chars);
      };
   
      this.colorTop = opt.colorTop || '#F9C938';
      this.colorBottom = opt.colorBottom || '#b37e1d';
      this.colorFoam = opt.colorFoam || 'white';
      this.colorMug = opt.colorMug || '#aaa';
      
      this.wallWidth = opt.wallWidth || 2;
      this.bottomThickness = opt.bottomThickness || this.wallWidth;
      this.foamHeight = opt.foamHeight || 3;
      
      this.yColor = d3.scale.linear().domain([this.foamHeight,this.height-this.bottomThickness]).range([this.colorTop, this.colorBottom]);
      
      this.grid = _.flatten(_.range(self.height).map(function(y){
          return _.range(self.width + ((y/self.height)>0.1 && (y/self.height)<0.8?6:0)).filter(function(x){
            if(y===0) return x>0 && x<self.width-1;
            if(x<self.width) return true;
            if(y-(self.height*0.1)<self.bottomThickness+1) return true;
            if((self.height*0.8)-y<self.bottomThickness+1) return true;
            if(x-self.width>=3) return true;
          }).map(function(x){
              var c = new BeerMug.Char({
                  x: x,
                  y: y,
                  mug: self
              });
              return c;
          });
      }));

      this.bubbles = [];

      function makeBubble(){
        var bubble = new BeerMug.Bubble(self);
        bubble.launch();
        curateBubbles();
      }

      var glassOnTop = _.range(0,this.width).filter(function(x){
        return (x)<self.wallWidth || (x+1)>(self.width-self.wallWidth);
      });

      function makeDrop(){
        var drop = new BeerMug.Bubble(self,{
            x: _.sample(glassOnTop),
            y: self.foamHeight,
            clobber: true, 
            speed: -2,
            length: -20
        });
        drop.launch();
      }

      function curateBubbles(){
        self.bubbles = self.bubbles.filter(function(d){
          return d.y>0 && d.y < self.height+5;
        });
      }

      setInterval(makeBubble, 2000);
      setInterval(makeDrop, 10000);
      makeDrop();

  }
                                                    
  BeerMug.defaultChars = _.range(33,126).map(function(n){return String.fromCharCode(n)});

  BeerMug.prototype.renderInto = function($svg){
      $svg.selectAll('text').data(this.grid,function(d){
          return [d.x,d.y].join(',');
      }).enter()
          .append('text')
          .each(function(d){d.$el = d3.select(this);})
          .attr('x',function(d){return d.getX()})
          .attr('y',function(d){return d.getY()})
          .style('fill',function(d){return d.color})
          .text(function(d){return d.char})
          .filter(function(d){return d.type==='foam'})
          .append('title').text('<head>');

  }

  BeerMug.prototype.getCharsNear = function(bubble){
    if(!length) length = 5;
    var gg = this.grid.filter(function(c){
      var d = bubble.distTo(c);
      return d>=0 && d<1 && Math.abs(bubble.x-c.x)<0.5;
      return Math.abs(c.x-x)<0.5 && (c.y-y)<length && (c.y-y)>0;
    });
    return gg;
  }

  BeerMug.Char = function(opt){
      var x = this.x = opt.x;
      var y = this.y = opt.y;
      var mug = this.mug = opt.mug;
      this.type = (
          function(mug){
              if(y<mug.foamHeight) return 'foam';
              if(
                  x<mug.wallWidth ||
                  (x+1)>(mug.width-mug.wallWidth) ||
                  (mug.height-y-1)<mug.bottomThickness
              ) 
                  return 'glass';
              return 'beer';
          })(this.mug);
      this.color = (
          function(type){
            switch(type){
              case 'foam': return mug.colorFoam;
              case 'glass': return mug.colorMug;
              case 'beer': return mug.yColor(y);
              default: return 'black';
            }
          })(this.type);
      this.colorScale = d3.scale.linear().domain([0,1]).range(['white',this.color]);
      this.setLetter();
      if(this.type==='foam'){
        setTimeout(this.pop.bind(this,true), Math.random()*50000);
      }
  }

  BeerMug.Char.prototype.setLetter = function(){
    this.char = this.mug.getChar();
  }

  BeerMug.Char.prototype.flip = function(changeChar, clobber){
    if(this.type==='foam') return;
    if(this.type !== 'glass' || clobber){
      if(changeChar) this.setLetter();
      if(this.$el) {
        this.$el.text(this.char).style('fill',this.color);
      }
    }
  }

  BeerMug.Char.prototype.pop = function(){
    this.setLetter();
    if(this.$el) {
      this.$el.text(this.char).style('fill',this.color);
    }
    setTimeout(this.pop.bind(this), Math.random()*50000);
  }

  BeerMug.Char.prototype.getX = function(){
      return this.x * this.mug.dx;
  }

  BeerMug.Char.prototype.getY = function(){
      return this.y * this.mug.dy;
  }

  BeerMug.Bubble = function(mug, opt){
    opt = opt || {};
    this.mug = mug;
    this.x = opt.x || _.random(mug.wallWidth,mug.width-mug.wallWidth-1, true);
    this.y = opt.y || mug.height;
    this.length = opt.length || 5;
    this.speed = opt.speed || Math.random()*0.5+0.1;
    this.clobber = opt.clobber;
  }

  BeerMug.Bubble.prototype.distTo = function(c){
    if(this.speed<0) return -(this.y-c.y)/this.length;//*(-this.speed/Math.abs(this.speed));
    return 1-(this.y-c.y)/this.length;
  }

  BeerMug.Bubble.prototype.launch = function(){
    var self = this;

    function rise(){
      self.y -= self.speed;
      _(self.mug.getCharsNear(self)).forEach(function(c){
        var dist = self.distTo(c);
        c.color = c.colorScale(dist);
        c.flip(Math.random()>dist, self.clobber);
      });
      if(self.y>0 && self.y < self.mug.height+20) setTimeout(rise, 100);
    }

    setTimeout(rise, 100);
  }

  $(init);
}

beerMe();
