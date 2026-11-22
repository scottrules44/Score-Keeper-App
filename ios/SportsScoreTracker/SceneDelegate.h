#import <UIKit/UIKit.h>

// iOS 27 requires apps to adopt the UIScene lifecycle; without a scene
// delegate UIKit traps at launch. This creates the React Native window per
// scene instead of in -application:didFinishLaunchingWithOptions:.
@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>

@property (nonatomic, strong) UIWindow *window;

@end
