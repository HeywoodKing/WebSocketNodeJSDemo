var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//表示服务器正常运行
app.get('/', function(req, res){
	res.send('<h1>Welcome Realtime Server By NodeJS...</h1>');
});

var port = 8900;

//http服务器监听8900端口
http.listen(port, function(){
	console.log('listening on *:' + port);
});

// 用户会话对象
var usocketObject = {};  //所有的socket对象
// 在线用户
var onlineUsers = {};
// 在线人数
var onlineCount = 0;
var sysTimeMsgObj = null;

var randContent = new Array(
	'今天和沙和尚跳舞，扒了沙和尚的衣服，被沙和尚一顿爆揍！！！',
	'唐僧怀孕了，白骨精贺喜！',
	'世界这么大，我想去看看',
	'有种奇迹叫郎平！',
	'宝强说：宝宝担心宝宝的宝宝是谁的宝宝，宝宝很生气',
	'24小时网警巡逻，请注意队形！',
	'心动不如行动',
	'开幕式上的“西红柿炒鸡蛋”',
	'24小时网警巡逻，请注意队形！',
	'少壮不努力，老大徒伤悲。',
	'世上无难事，只要肯登攀。',
	'宝剑锋从磨砺出，梅花香自苦寒来。',
	'吃得苦中苦，方为人上人。',
	'莫等闲，白了少年头，空悲切。',
	'有志者，事竟成，破釜沉舟，百二秦关终属楚；苦心人，天不负，卧薪尝胆，三千越甲可吞吴。',
	'男儿不展风云志，空负天生八尺躯。',
	'冰冻三尺，非一日之寒。',
	'心有多大，舞台就有多大。',
	'成功就是把复杂的问题简单化，然后狠狠去做。',
	'大多数人想要改造这个世界，但却罕有人想改造自己。',
	'给大家推荐：路易-波拿巴的零年十八月',
	'皇上驾到：众臣公请安，臣妾做不到啊！'
);

// 定义了一个news的命名空间 
// var news = io.of('/news')
io.on('connection', function(socket){
	console.log('a user connected');

	//监听用户加入
	socket.on('login', function(obj){
		// 将新加入用户的唯一标识当作socket的名称，后面退出的时候会用到
		socket.name = obj.userid;

		//检查在线列表，如果不在里面就加入
		if(!onlineUsers.hasOwnProperty(obj.userid)){
			onlineUsers[obj.userid] = obj.username;
			//在线人数+1
			onlineCount++;

			usocketObject[socket.name] = socket;
		}

		//向所有客户端广播用户加入
		io.emit('login', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
		console.log(obj.username + '加入了聊天室');
	});

	// 监听用户退出
	socket.on('disconnect', function(){
		// 将退出的用户从在线列表中删除
		if(onlineUsers.hasOwnProperty(socket.name)){
			//退出用户的信息
			var obj = {userid:socket.name, username:onlineUsers[socket.name]};

			// 删除
			delete onlineUsers[socket.name];  //socket.name=obj.userid
			delete usocketObject[socket.name];
			// 在线人数-1
			onlineCount--;

			//向所有客户端广播用户退出
			io.emit('logout', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
			console.log(obj.username + '退出了聊天室');
		}
	});

	//监听所有用户发布聊天内容(公有消息)
	socket.on('message', function(obj){
		//向所有客户端广播发布的消息
		io.emit('message', obj);
		console.log(obj.username + '说：' + obj.content);

		// 获取变量
		// socket.get('nickname', function(err, name){
		// 	console.log('Chat message by ', name);
		// });
	});

	// 私聊的连接
	socket.on('privateConnect', function(obj){
		// usocketObject[obj.userid].emit('privateConnect', obj);
		if(obj.to in usocketObject){
			// 向指定的客户端发布消息		
			// 这里的socket是每一个请求的私聊回话对象
			usocketObject[obj.to].emit('privateConnect', obj);
			console.log(obj.username + obj.content);
		}
	});

	// 监听指定客户的消息(私有消息)
	socket.on('privateMessage', function(obj){
		usocketObject[obj.userid].emit('privateMessage', obj);
		if(obj.to in usocketObject){
			// 向指定的客户端发布消息		
			// 这里的socket是每一个请求的私聊回话对象
			usocketObject[obj.to].emit('privateMessage', obj);
			console.log(obj.username + "说：" +  obj.content);
		}
	});

	// 设置保存用户名
	// socket.on('setNickname', function(name){
	// 	socket.set('nickname', name, function(){
	// 		socket.emit('ready');
	// 	});
	// });

	// 自定义事件，主动发送广播消息给每一位用户
	socket.on('system', function(obj){
		switch(obj.flag){
			case 0:
				break;
			case 1:
				// 0表示更换昵称
				// 这里需要将在线用户对象中的名称更改
				if(onlineUsers.hasOwnProperty(obj.userid)){
					onlineUsers[obj.userid] = obj.newusername;
				}
				break;
			default:
				break;
		}
		//向所有客户端广播系统消息
		io.emit('system', {user: obj, onlineUsers: onlineUsers});
		console.log("系统消息：" + obj.content);
	});

	// 主动发送广播消息给每一位用户
	// socket.on('customEvent', function(){
	// 	sysTimeMsgObj = setInterval(function(){
	// 		var obj = {
	// 				userid: '10000',
	// 				username: 'system',
	// 				content: '今天和沙和尚跳舞，扒了沙和尚的衣服，被沙和尚一顿爆揍！！！'
	// 			};

	// 		//向所有客户端广播系统消息
	// 		io.emit('customEvent', obj);
	// 		console.log(obj.username + '：' + obj.content);
	// 	}, 3000);
	// });

	if (sysTimeMsgObj == null) {
		sysTimeMsgObj = setInterval(function(){
			var index = parseInt(Math.random() * (randContent.length - 1));
			var obj = {
				flag: 0, //系统定时广播内容
				userid: '10000',
				username: 'system',
				content: randContent[index]
			};

			//向所有客户端广播系统消息
			io.emit('system', obj);
			console.log(obj.username + '：' + obj.content);  //+ (randContent.length - 1)
		}, 1000 * 60);
	}
	
});

