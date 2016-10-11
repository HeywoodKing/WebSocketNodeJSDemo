(function ($) {
	var dc = document.compatMode == 'CSS1Compat',
	dx = dc ? document.documentElement : document.body,
	ec = encodeURIComponent;
	var port = 8900;
	var url = 'ws://192.168.10.253:' + port;
	// var url = 'ws://localhost:' + port;
	var nicknameList = [
		'喜欢跳舞的沙和尚',
		'得得得的唐僧',
		'爱捣蛋的泼猴',
		'爱管闲事的司马无情',
		'爱凑热闹的欧阳无敌',
		'山里的刘二麻子',
		'豹子头林大郎',
		'青面兽杨志',
		'花和尚鲁智深',
		'九纹龙史进',
		'扑天雕李应',
		'大刀关胜',
		'玉麒麟卢俊义'
	];

	// window.UserData = {
	// 	uid: null,
	// 	username: null,
	// 	computeNo: null,
	// 	init: function(){
	// 		// 
	// 	},		
	// 	sendMessage: function(obj){
	// 		// 
	// 	},
	// 	updateMessage: function(){
	// 	}
	// };

	// JSocket消息推送
	window.JSocket = {
		isPrivateObj: false,
		privateMsgObj: null,
		sendTo: null,
		msgObj: null,
		userObj: null,
		screenHeight: window.innerHeight ? window.innerHeight : dx.clientHeight,
		username: null,
		userid: null,
		socket: null,
		//让浏览器滚动条保持在最低部
		scrollToBottom: function(obj){

			window.scrollTo(0, obj.clientHeight);
		},

		//第一个界面用户进入
		userEnter: function(){
			var nickname = $("#nickname");
			var content = $('#content');
			if(nickname.val() != ""){
				// $("#loginbox").css('display','none');
				// $("#chatbox").css('display','block');
				//nickname.val('');
			}else{
				nickname.val(this.getNickname());
			}
			
			// $("#notice").html('进入聊天室，请遵守聊天规则，谢谢！').fadeIn(1000).fadeOut(2000);
			this.init(nickname.val());
			this.initPrivate();

			content.val('');
			content.focus();
			return false;
		},

		replaceNickname: function(){
			var nickname = $("#nickname");
			if(this.username != nickname.val()){
				var content = $('#content');
				if($.trim(nickname.val()) == ""){
					nickname.val(this.getNickname());
				}
				// alert(this.username + " 更名为 " + $.trim(nickname.val()));
				this.sendSystemMessage(this.username + " 更名为 " + $.trim(nickname.val()));
				content.focus();
			}
			return false;
		},

		// 初始化函数
		init: function(username){
			/*
			客户端根据时间和随机数生成uid,这样使得聊天室用户名称可以重复。
			实际项目中，如果是需要用户登录，那么直接采用用户的uid来做标识就可以
			*/
			this.msgObj = $("#message");
			this.userObj = $("#userlistul");
			this.userid = this.getUid();
			this.username = username;
			$("#showusername").html(this.username);
			this.msgObj.css('minHeight', (this.screenHeight - document.body.clientHeight + this.msgObj.clientHeight) + "px");
			this.scrollToBottom(this.msgObj);

			
			//连接websocket后端服务器
			this.socket = io.connect(url);
			
			//告诉服务器端有用户登录,主动告诉服务器有有用户登录
			this.socket.emit('login', {userid:this.userid, username:this.username});
			
			//监听新用户登录(从服务器端接收到用户登录的消息)
			this.socket.on('login', function(o){
				JSocket.updateSysMsg('login', o);
			});
			
			//监听用户退出(从服务器端接收到用户退出的消息)
			this.socket.on('logout', function(o){
				JSocket.updateSysMsg('logout', o);
			});
			
			//监听消息发送(从服务器端接收到用户发送的消息)
			this.socket.on('message', function(obj){
				var isme = (obj.userid == JSocket.userid) ? true : false;
				var contentDiv = '<div>' + obj.content + '</div>';
				var usernameDiv = '<span>' + obj.username + '</span>';
				var section = document.createElement('section');
				if(isme){
					section.className = 'user';
					section.innerHTML = contentDiv + usernameDiv;
				} else {
					section.className = 'service';
					section.innerHTML = usernameDiv + contentDiv;
				}

				JSocket.msgObj.append(section);
				JSocket.scrollToBottom(JSocket.msgObj);

				// var win = openWin();
				// win.document.write(obj.username + "说：" + obj.content);
				// win.focus();

				$("#winMessage").fadeIn(300);
				// $("#messageIframe").find('html body .message').html("12312313212");
			});

			// 监听从服务器发送来的消息
			this.socket.on('system', function(obj){
				// console.log(obj);
				if(obj.flag == 1){
					// 更年昵称左侧列表也需要更名
					JSocket.addUserToList('system', obj.onlineUsers, obj);
				}

				JSocket.showMsgToGUI('system', obj);
			});
		},

		// 私聊初始化
		initPrivate: function(){
			//连接websocket后端服务器
			// this.socket = io.connect(url);

			var obj = {
				to:this.sendTo, 
				userid:this.userid, 
				username:this.username, 
				content:"要和您单独坐会"
			};

			this.privateMsgObj = $("#privateMessage");
			this.privateMsgObj.css('minHeight', (this.screenHeight - document.body.clientHeight + this.privateMsgObj.clientHeight) + "px");
			this.scrollToBottom(this.privateMsgObj);
			
			//告诉服务器我要和userid私聊
			this.socket.emit('privateConnect', obj);
			
			// //监听新用户登录(从服务器端接收到用户登录的消息)
			// this.socket.on('login', function(o){
			// 	JSocket.updateSysMsg('login', o);
			// });
			
			// //监听用户退出(从服务器端接收到用户退出的消息)
			// this.socket.on('logout', function(o){
			// 	JSocket.updateSysMsg('logout', o);
			// });

			// 监听服务器私有连接
			this.socket.on('privateConnect', function(obj){
				JSocket.showMsgToGUI('privateConnect', obj);
			});

			this.socket.on('privateMessage', function(obj){
				var isme = (obj.userid == JSocket.userid) ? true : false;
				var contentDiv = '<div>' + obj.content + '</div>';
				var usernameDiv = '<span>' + obj.username + '</span>';
				var section = document.createElement('section');
				if(isme){
					section.className = 'user';
					section.innerHTML = contentDiv + usernameDiv;
				} else {
					section.className = 'service';
					section.innerHTML = usernameDiv + contentDiv;
				}

				JSocket.privateMsgObj.append(section);
				JSocket.scrollToBottom(JSocket.privateMsgObj);

				$("#winMessage").fadeIn(300);
			});
		},

		//退出，本例只是一个简单的刷新
		logout: function(){
			this.socket.disconnect();
			location.reload();
		},

		//发送系统消息内容
		sendSystemMessage: function(msgContent){
			var content = $("#content");			
			var obj = {
				flag: 1, // 1表示更改昵称消息
				userid: this.userid,
				username: this.username,
				newusername: $.trim($("#nickname").val()),
				content: msgContent
			};
			// 将消息发送到服务器
			this.socket.emit('system', obj);
			this.username = $.trim($("#nickname").val());
			content.focus();
			// return false;
		},

		//发送聊天消息内容
		sendMessage: function(){
			var content = $("#content");
			if($.trim(content.val()) != ''){
				var obj = {
					userid: this.userid,
					username: this.username,
					content: content.val()
				};
				// 将消息发送到服务器
				this.socket.emit('message', obj);
				content.val('');
			}
			content.focus();
			// return false;
		},

		//发送聊天消息内容
		sendPrivateMessage: function(){
			var content = $("#content");
			if($.trim(content.val()) != ''){
				var obj = {
					to: this.sendTo,
					userid: this.userid,
					username: this.username,
					content: content.val()
				};
				// 将消息发送到服务器
				this.socket.emit('privateMessage', obj);
				content.val('');
			}
			content.focus();
			// return false;
		},

		getUid: function(){

			return new Date().getTime() + "" + Math.floor(Math.random() * 899 + 100);
		},

		getNickname: function(){
			// return new Date().getTime() + "" + Math.floor(Math.random() * 899 + 100);
			return nicknameList[parseInt(Math.random() * 12)];
		},

		//更新系统消息，本例中在用户加入、退出的时候调用
		updateSysMsg: function(action, obj){
			//当前在线用户列表
			var onlineUsers = obj.onlineUsers;
			//当前在线人数
			var onlineCount = obj.onlineCount;
			//新加入用户的信息
			var user = obj.user;
				
			//更新在线人数
			// var userhtml = '';
			// var userhtmlId = '';
			// var separator = '';
			// for(key in onlineUsers) {
		 	// 	   if(onlineUsers.hasOwnProperty(key)){
			// 		userhtml += separator + onlineUsers[key];
			// 		separator = '、';
			// 	}
		 	// }
		    // $("#onlineId").html($("#onlineId").html() + separator + userhtmlId);
			// $("#onlinecount").html('当前共有 ' + onlineCount + ' 人在线，在线列表：' + userhtml);

			// 更新当前在线人数
			$("#nowuserscount").html(onlineCount);
			
			//添加用户到列表
			JSocket.addUserToList(action, onlineUsers, user);
			//添加系统消息
		 	JSocket.showMsgToGUI(action, user);
		},

		// 添加用户到用户列表
		addUserToList: function(action, onlineUsers, newUser){
			// 首先移除原来的然后添加现有的用户
			this.userObj.children().detach();
			var meHtml = '';
			//添加用户列表
			// if(action == 'login'){
			var userHtml = '';
			for(key in onlineUsers) {
				if(onlineUsers.hasOwnProperty(key)){
					if(key == this.userid){
						// 自己
						meHtml += '<li class="list-group-item" data="' + key + '">';
						meHtml += '<span class="badge"></span>';
						meHtml += '<span style="margin-right:5px;" class="glyphicon glyphicon-user"></span>';	    			
				    	meHtml += '<span class="nickname">' + onlineUsers[key] + ' (我) <span></span></span>'	    		
						meHtml += '</li>';
					}else{
						userHtml += '<li class="list-group-item" data="' + key + '">';
						userHtml += '<span class="badge"></span>';
						userHtml += '<span style="margin-right:5px;" class="glyphicon glyphicon-user"></span>';	    			
				    	userHtml += '<span class="nickname">' + onlineUsers[key] + '<span></span></span>'	    		
						userHtml += '</li>';
					}
				}
			}

		    //添加新用户
		 	// userHtml += '<li class="list-group-item" data="' + newUser.userid + '">';
			// userHtml += '<span class="badge"></span>';
			// userHtml += '<span style="margin-right:5px;" class="glyphicon glyphicon-user"></span>';	    			
			// userHtml += '<span class="nickname">' + newUser.username + '<span></span></span>';
			// userHtml += '</li>';

			this.userObj.append(meHtml + userHtml);
			// }else if(action == 'logout'){
			// 	// 移除用户
			// }
		},

		// 显示公共消息到界面
		showMsgToGUI: function(action, obj){
			//添加系统消息
			var html = '';
			html += '<div class="msg-system">';
			//html += obj.username;
			switch(action) {
				case 'login':					
					html += obj.username + ' 加入了聊天室';
					break;
				case 'logout':
					html += obj.username + ' 退出了聊天室';
					break;
				// case 'customEvent':
				// 	html += obj.content;
					break;
				case 'system':
					html += obj.content;
					break;
				case 'privateConnect':
					html += obj.username + obj.content;
					break;
				default:
					break;
			}
			html += '</div>';

			var section = document.createElement('section');
			section.className = 'system';  //J-mjrlinkWrap J-cutMsg
			section.innerHTML = html;

			console.log(obj);
			// if(this.privateMsgObj != null){
			// 	console.log(obj);
			// 	console.log(this.privateMsgObj);
			// 	this.privateMsgObj.append(section);
			// }
			console.log(section);
			if(obj.flag == 0){
				this.privateMsgObj.append(section);
			}
			// alert(this.privateMsgObj.html());

			this.msgObj.append(section);
			this.scrollToBottom(this.msgObj);
		},

		// 发送系统提示消息
		updateSysMsgHint: function(){
			var obj = {
				flag: 0,
				userid: getUid(),
				username: '拉本登',
				content: '我是送悟空'
			};
			// 将消息发送到服务器
			this.socket.emit('system', obj);
			return false;
		},

		// 私聊面板

	};


	window.JSocket.Users = {
		userid: null,
		username: null,
		content: null
	};

})(jQuery);