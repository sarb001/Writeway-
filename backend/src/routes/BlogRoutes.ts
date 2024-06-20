import { PrismaClient } from '@prisma/client/edge';
import { Hono } from 'hono';
import { BlogValidation, UserSignup , UserValidation } from 'common-types-users';
import { verify } from 'hono/jwt';
import { withAccelerate } from '@prisma/extension-accelerate';
 
export const BlogRouter = new Hono<{
    Bindings : {
        DATABASE_URL :string,
        PRIVATE_KEY : string
    },
    Variables : {
        userid : string
    }
}>();

// Middleware 
BlogRouter.use('/*' , async(c,next) => {
    const jwt  = c.req.header('Authorization');
	console.log('token is==',jwt);

	if(!jwt){
		return c.json({ msg: "UnAuthorized"})
	}

	const Privatekey = c.env.PRIVATE_KEY;
	const user = await verify(jwt,Privatekey);
	console.log('user is =',user);
	
	if(!user){
		return c.json({
			msg : "User not Present"
		})
	}else{
        c.set("jwtPayload",user?.id)
		return next();
	}
})

BlogRouter.post('/createblog' , async(c) => {
	const prisma = new  PrismaClient({
		datasourceUrl : c.env.DATABASE_URL
	 }).$extends(withAccelerate());

	 const userid = c.get('jwtPayload');
	 console.log('getUserid =',userid);

	const Body = await c.req.json();
	const ParsedResponse = BlogValidation.safeParse(Body);
	
	if(!ParsedResponse.success){
	 	c.json({ msg : "You sent the wrong inputs", errors: ParsedResponse.error.issues})
		return;
	}

	const response = await prisma.blogs.create({
		data : {
			Blogid: userid,
			title : ParsedResponse?.data.title,
			description : ParsedResponse?.data.description,
		}
	});
	return c.json({response})

})

BlogRouter.get('/bulk' , async(c) => {
	const prisma = new  PrismaClient({
		datasourceUrl : c.env.DATABASE_URL
	 }).$extends(withAccelerate());

	 const AllBlogs = await prisma.blogs.findMany({
			select : {
				id : true,
				title : true,
				imageUrl : true,
				description : true,
				Blogid : true,
				publishedDate : true,
				author :{
					select : {
						name :true
					}
				}
			}
	 });
	 console.log('all Blogs =',AllBlogs);

	 return c.json({
		msg: "All Blogs  Fetched",
		AllBlogs
	 })
})

// Edit the Blog 
BlogRouter.put('/' , async(c) => {

	const prisma = new  PrismaClient({
		datasourceUrl : c.env.DATABASE_URL
	 }).$extends(withAccelerate());

	const Body = await c.req.json();
	const ParsedResponse = BlogValidation.safeParse(Body);
	console.log('Parsed Bodyis =',ParsedResponse);
	
	if(!ParsedResponse.success){
	 	c.json({ msg : "You sent the wrong inputs", errors: ParsedResponse.error.issues})
		return;
	}

	const updateblog = await prisma.blogs.update({
		where : {
			id : Body?.id
		},
		data : {
			title : ParsedResponse?.data?.title,
			description : ParsedResponse?.data?.description,
		}
	});
	console.log('updated user= ',updateblog);

	return c.json({id : updateblog?.id})

});

// Fetch Single Blog 
BlogRouter.get('/:id' , async(c) => {
	const Userid =  c.req.param('id');
	console.log('userid =',Userid);
	const prisma = new  PrismaClient({
		datasourceUrl : c.env.DATABASE_URL
	 }).$extends(withAccelerate());

	const blog = await prisma.blogs.findUnique({
		where :{
			id : Number(Userid)
		},
		select: {
			id : true,
			title : true,
			imageUrl : true,
			description : true,
			Blogid : true,
			publishedDate : true,
			author: {
				select: {
					name :true
				}
			}
		}
	});

	return c.json({
		blog : blog
	})

});

